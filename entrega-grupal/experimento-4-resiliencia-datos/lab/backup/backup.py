"""Backups consistentes: mysqldump --single-transaction + SHA256 + archivo temporal (H4/H12)."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path

from common_events import (
    append_event,
    assert_db_name,
    assert_host_allowed,
    require_destructive_preflight,
    stop_requested,
    utc_now,
)
from lab_identity import ALLOWED_DB, ALLOWED_PROJECT


def backups_dir() -> Path:
    return Path(os.environ.get("BACKUPS_DIR", "/backups"))


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def enforce_retention(retention: int) -> None:
    root = backups_dir()
    metas = sorted(root.glob("backup-*.meta.json"), key=lambda p: p.stat().st_mtime)
    while len(metas) > retention:
        oldest = metas.pop(0)
        meta = json.loads(oldest.read_text(encoding="utf-8"))
        dump = root / meta.get("dump_file", "")
        if dump.exists() and dump.parent.resolve() == root.resolve():
            dump.unlink(missing_ok=True)
        oldest.unlink(missing_ok=True)
        append_event("backup_retention_deleted", backup_id=meta.get("backup_id"), dump=str(dump.name))


def take_backup(run_id: str, scenario: str) -> dict:
    host = os.environ.get("MYSQL_HOST", "172.31.10.10")
    db = ALLOWED_DB  # immutable
    require_destructive_preflight(host=host, db=db, authorized=True)
    assert_host_allowed(host)
    assert_db_name(db)

    port = os.environ.get("MYSQL_PORT", "3306")
    user = os.environ.get("MYSQL_USER", "lab_resilience_app")
    password = os.environ.get("MYSQL_PASSWORD", "lab-exp4-app-not-real")

    root = backups_dir()
    root.mkdir(parents=True, exist_ok=True)
    stamp = utc_now().replace(":", "").replace("-", "")
    backup_id = f"backup-{scenario}-{stamp}"
    dump_name = f"{backup_id}.sql"
    dump_path = root / dump_name
    tmp_path = root / f".{backup_id}.sql.partial"
    meta_path = root / f"{backup_id}.meta.json"

    t0 = utc_now()
    append_event("backup_started", run_id=run_id, scenario=scenario, backup_id=backup_id, t_backup_start=t0)

    env = os.environ.copy()
    env["MYSQL_PWD"] = password
    # H4: sin --routines/--triggers (no hay rutinas en el lab; evita privilegios extras)
    cmd = [
        "mysqldump",
        "-h",
        host,
        "-P",
        port,
        "-u",
        user,
        "--single-transaction",
        "--databases",
        db,
        "--result-file",
        str(tmp_path),
    ]
    try:
        proc = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if proc.returncode != 0 or not tmp_path.exists() or tmp_path.stat().st_size == 0:
            append_event(
                "backup_failed",
                run_id=run_id,
                scenario=scenario,
                backup_id=backup_id,
                stderr=(proc.stderr or "")[-500:],
            )
            tmp_path.unlink(missing_ok=True)
            raise SystemExit(f"mysqldump failed rc={proc.returncode}")

        digest = sha256_file(tmp_path)
        os.replace(tmp_path, dump_path)  # publish only after success
        t1 = utc_now()
        meta = {
            "backup_id": backup_id,
            "run_id": run_id,
            "scenario": scenario,
            "project": ALLOWED_PROJECT,
            "database": ALLOWED_DB,
            "dump_file": dump_name,
            "sha256": digest,
            "bytes": dump_path.stat().st_size,
            "t_backup_start_utc": t0,
            "t_backup_end_utc": t1,
            "tool": "mysqldump --single-transaction",
            "note": "Configured backup interval is NOT observed RPO.",
        }
        meta_tmp = root / f".{backup_id}.meta.json.partial"
        meta_tmp.write_text(json.dumps(meta, indent=2), encoding="utf-8")
        os.replace(meta_tmp, meta_path)
        append_event(
            "backup_completed",
            run_id=run_id,
            scenario=scenario,
            backup_id=backup_id,
            sha256=digest,
            bytes=meta["bytes"],
            t_backup=t1,
            dump_file=dump_name,
        )
        return meta
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise


def loop_mode(run_id: str, scenario: str, interval_sec: int, retention: int) -> int:
    while True:
        if stop_requested():
            append_event("backup_loop_stopped", run_id=run_id, scenario=scenario)
            return 0
        take_backup(run_id, scenario)
        enforce_retention(retention)
        time.sleep(max(1, interval_sec))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--scenario", required=True, choices=["r0", "r1", "smoke"])
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--interval-sec", type=int, default=int(os.environ.get("BACKUP_INTERVAL_SEC", "300")))
    parser.add_argument("--retention", type=int, default=int(os.environ.get("BACKUP_RETENTION", "20")))
    args = parser.parse_args()
    if stop_requested():
        print("STOP present; refusing backup", file=sys.stderr)
        return 2
    if args.once:
        meta = take_backup(args.run_id, args.scenario)
        enforce_retention(args.retention)
        print(json.dumps(meta))
        return 0
    return loop_mode(args.run_id, args.scenario, args.interval_sec, args.retention)


if __name__ == "__main__":
    raise SystemExit(main())
