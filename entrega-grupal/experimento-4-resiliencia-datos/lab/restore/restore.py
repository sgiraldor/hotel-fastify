"""Restauración segura + integridad fuerte (H3/H7/H8/H11)."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import pymysql

from common_events import (
    append_event,
    assert_db_name,
    assert_host_allowed,
    assert_lab_identity_row,
    require_destructive_preflight,
    stop_requested,
    utc_now,
)
from lab_identity import ALLOWED_DB, ALLOWED_PROJECT, LAB_META_DB_KEY, LAB_META_PROJECT_KEY


def backups_dir() -> Path:
    return Path(os.environ.get("BACKUPS_DIR", "/backups"))


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def connect(user: str | None = None, password: str | None = None):
    host = os.environ.get("MYSQL_HOST", "172.31.10.10")
    assert_host_allowed(host)
    assert_db_name(ALLOWED_DB)
    return pymysql.connect(
        host=host,
        port=int(os.environ.get("MYSQL_PORT", "3306")),
        user=user or os.environ.get("MYSQL_USER", "root"),
        password=password or os.environ.get("MYSQL_PASSWORD", "lab-exp4-root-not-real"),
        database=ALLOWED_DB,
        connect_timeout=10,
    )


def preflight_destination(*, authorized: bool) -> None:
    host = os.environ.get("MYSQL_HOST", "172.31.10.10")
    require_destructive_preflight(host=host, db=ALLOWED_DB, authorized=authorized)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT DATABASE()")
            current = cur.fetchone()[0]
            assert_db_name(current)
            cur.execute("SELECT v FROM lab_meta WHERE k=%s", (LAB_META_PROJECT_KEY,))
            project = cur.fetchone()
            cur.execute("SELECT v FROM lab_meta WHERE k=%s", (LAB_META_DB_KEY,))
            dbmeta = cur.fetchone()
            assert_lab_identity_row(project[0] if project else None, dbmeta[0] if dbmeta else None)


def load_meta(backup_id: str) -> dict:
    meta_path = backups_dir() / f"{backup_id}.meta.json"
    if not meta_path.exists():
        raise SystemExit(f"meta not found: {meta_path.name}")
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    if meta.get("database") != ALLOWED_DB:
        raise SystemExit("REFUSED: backup database is not lab_resilience_db")
    if meta.get("project") != ALLOWED_PROJECT:
        raise SystemExit("REFUSED: backup project mismatch")
    dump = backups_dir() / meta["dump_file"]
    if not dump.exists():
        raise SystemExit("dump missing")
    dump_res = dump.resolve()
    root_res = backups_dir().resolve()
    if root_res not in dump_res.parents and dump_res != root_res:
        raise SystemExit("REFUSED: dump path escapes backups dir")
    if dump.name.startswith(".") or dump.name.endswith(".partial"):
        raise SystemExit("REFUSED: refusing incomplete/partial dump")
    digest = sha256_file(dump)
    if digest != meta.get("sha256"):
        raise SystemExit("REFUSED: sha256 mismatch before restore")
    meta["_dump_path"] = str(dump)
    meta["_sha256_verified"] = digest
    return meta


def expected_commit_count_from_ledger(run_id: str, backup_end_utc: str | None) -> int | None:
    """Commits confirmed on or before backup end (RPO-expected recoverable set)."""
    ledger = Path(os.environ.get("EVIDENCE_DIR", "/evidence")) / "commits_ledger.jsonl"
    if not ledger.exists() or not backup_end_utc:
        return None
    count = 0
    for line in ledger.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get("run_id") != run_id:
            continue
        if row.get("committed_at_utc", "") <= backup_end_utc:
            count += 1
    return count


def verify_integrity(run_id: str, backup_meta: dict | None = None) -> dict:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
            cur.execute("SELECT v FROM lab_meta WHERE k=%s", (LAB_META_PROJECT_KEY,))
            project = cur.fetchone()
            cur.execute("SELECT v FROM lab_meta WHERE k=%s", (LAB_META_DB_KEY,))
            dbmeta = cur.fetchone()
            assert_lab_identity_row(project[0] if project else None, dbmeta[0] if dbmeta else None)

            # H7: orden por seq monotónica vía payload o por id AUTO_INCREMENT
            cur.execute(
                """
                SELECT commit_id, committed_at_utc, id, payload
                FROM synthetic_commits
                WHERE run_id=%s
                ORDER BY id ASC
                """,
                (run_id,),
            )
            rows = cur.fetchall()
            last = rows[-1] if rows else None
            functional_ok = True
            try:
                cur.execute("SELECT COUNT(*) FROM synthetic_commits WHERE run_id=%s", (run_id,))
                cur.fetchone()
            except Exception:  # noqa: BLE001
                functional_ok = False

            expected = None
            if backup_meta:
                expected = expected_commit_count_from_ledger(run_id, backup_meta.get("t_backup_end_utc"))

            actual = len(rows)
            # H8: corrupción = menos filas que las esperadas del backup; RPO loss = commits post-backup (no aquí)
            corruption = False
            if expected is not None and actual < expected:
                corruption = True

            service_ok = bool(
                functional_ok
                and project
                and project[0] == ALLOWED_PROJECT
                and not corruption
                and (expected is None or actual == expected or actual >= 0)
            )
            # service_ok requires functional query + identity; matching expected when known
            if expected is not None:
                service_ok = functional_ok and (actual == expected) and not corruption

            return {
                "service_ok": service_ok,
                "db_available": True,
                "functional_query_ok": functional_ok,
                "project": project[0] if project else None,
                "commit_count": actual,
                "expected_commit_count_from_backup": expected,
                "corruption_suspected": corruption,
                "last_commit_id": last[0] if last else None,
                "last_committed_at_utc": str(last[1]) if last else None,
                "last_commit_pk": int(last[2]) if last else None,
                "backup_id": (backup_meta or {}).get("backup_id"),
            }


def apply_restore(meta: dict, run_id: str, scenario: str, mode: str) -> dict:
    preflight_destination(authorized=True)
    t0 = utc_now()
    append_event(
        "restore_started",
        run_id=run_id,
        scenario=scenario,
        mode=mode,
        backup_id=meta["backup_id"],
        t_restore_inicio=t0,
    )
    env = os.environ.copy()
    env["MYSQL_PWD"] = os.environ.get("MYSQL_PASSWORD", "lab-exp4-root-not-real")
    cmd = [
        "mysql",
        "-h",
        os.environ.get("MYSQL_HOST", "172.31.10.10"),
        "-P",
        os.environ.get("MYSQL_PORT", "3306"),
        "-u",
        os.environ.get("MYSQL_USER", "root"),
    ]
    with open(meta["_dump_path"], "rb") as fh:
        proc = subprocess.run(cmd, env=env, stdin=fh, capture_output=True)
    if proc.returncode != 0:
        append_event(
            "restore_failed",
            run_id=run_id,
            scenario=scenario,
            backup_id=meta["backup_id"],
            stderr=proc.stderr[-500:].decode("utf-8", "replace"),
        )
        raise SystemExit(f"mysql restore failed rc={proc.returncode}")
    t1 = utc_now()
    integrity = verify_integrity(run_id, meta)
    append_event(
        "restore_completed",
        run_id=run_id,
        scenario=scenario,
        mode=mode,
        backup_id=meta["backup_id"],
        t_restore_fin=t1,
        t_backup_restored=meta.get("t_backup_end_utc"),
        integrity=integrity,
    )
    return {"restore_end": t1, "integrity": integrity, "backup_id": meta["backup_id"]}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--scenario", required=True, choices=["r0", "r1", "smoke"])
    parser.add_argument("--backup-id", required=True)
    parser.add_argument("--mode", choices=["manual", "auto"], default="manual")
    parser.add_argument("--authorized", action="store_true")
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()

    if args.verify_only:
        meta = None
        try:
            meta = load_meta(args.backup_id)
        except SystemExit:
            meta = {"backup_id": args.backup_id}
        print(json.dumps(verify_integrity(args.run_id, meta if "dump_file" in (meta or {}) else None), indent=2, default=str))
        return 0

    if not args.authorized:
        print("REFUSED: pass --authorized after destination checks (safe-by-default)", file=sys.stderr)
        return 2
    if stop_requested():
        print("REFUSED: STOP present", file=sys.stderr)
        return 2

    meta = load_meta(args.backup_id)
    result = apply_restore(meta, args.run_id, args.scenario, args.mode)
    print(json.dumps(result, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
