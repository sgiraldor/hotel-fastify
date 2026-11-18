"""Fallo lógico controlado — solo lab_resilience_db / seguridad-caos-exp4 (H3)."""
from __future__ import annotations

import argparse
import json
import os
import sys

import pymysql

from common_events import (
    append_event,
    assert_lab_identity_row,
    require_destructive_preflight,
    stop_requested,
    utc_now,
)
from lab_identity import ALLOWED_DB, ALLOWED_PROJECT, LAB_META_DB_KEY, LAB_META_PROJECT_KEY

ALLOWED_TABLES = {"synthetic_fault_target", "synthetic_commits"}


def connect():
    host = os.environ.get("MYSQL_HOST", "172.31.10.10")
    require_destructive_preflight(host=host, db=ALLOWED_DB, authorized=True)
    return pymysql.connect(
        host=host,
        port=int(os.environ.get("MYSQL_PORT", "3306")),
        user=os.environ.get("MYSQL_USER", "root"),
        password=os.environ.get("MYSQL_PASSWORD", "lab-exp4-root-not-real"),
        database=ALLOWED_DB,
        autocommit=True,
        connect_timeout=10,
    )


def inject_fault(run_id: str, scenario: str, wipe_commits: bool) -> dict:
    if not run_id.startswith(("r0-", "r1-", "smoke-")):
        raise SystemExit("REFUSED: run_id prefix not recognized for lab")

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT DATABASE()")
            if cur.fetchone()[0] != ALLOWED_DB:
                raise SystemExit("REFUSED: current database mismatch")
            cur.execute("SELECT v FROM lab_meta WHERE k=%s", (LAB_META_PROJECT_KEY,))
            project = cur.fetchone()
            cur.execute("SELECT v FROM lab_meta WHERE k=%s", (LAB_META_DB_KEY,))
            dbmeta = cur.fetchone()
            assert_lab_identity_row(project[0] if project else None, dbmeta[0] if dbmeta else None)

            cur.execute(
                """
                SELECT commit_id, committed_at_utc, id, payload
                FROM synthetic_commits
                WHERE run_id=%s
                ORDER BY id ASC
                """,
                (run_id,),
            )
            before_rows = cur.fetchall()
            before = [
                {
                    "commit_id": r[0],
                    "committed_at_utc": str(r[1]),
                    "pk": int(r[2]),
                    "payload": r[3],
                }
                for r in before_rows
            ]
            last_before = before[-1] if before else None
            t_fault = utc_now()
            append_event(
                "fault_injected",
                run_id=run_id,
                scenario=scenario,
                t_fallo=t_fault,
                last_commit_before_fault=last_before,
                commits_before=len(before),
                mode="logical_wipe_run_scoped",
                project=ALLOWED_PROJECT,
                database=ALLOWED_DB,
            )
            cur.execute("DELETE FROM synthetic_fault_target WHERE run_id=%s", (run_id,))
            deleted_fault = cur.rowcount
            deleted_commits = 0
            if wipe_commits:
                cur.execute("DELETE FROM synthetic_commits WHERE run_id=%s", (run_id,))
                deleted_commits = cur.rowcount
            cur.execute("SELECT COUNT(*) FROM synthetic_commits WHERE run_id=%s", (run_id,))
            remaining = cur.fetchone()[0]
            result = {
                "t_fallo": t_fault,
                "deleted_fault_rows": deleted_fault,
                "deleted_commit_rows": deleted_commits,
                "commits_remaining": int(remaining),
                "last_commit_before_fault": last_before,
                "tables_touched": sorted(ALLOWED_TABLES),
            }
            append_event("fault_completed", run_id=run_id, scenario=scenario, **result)
            return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Controlled logical fault (lab only)")
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--scenario", required=True, choices=["r0", "r1"])
    parser.add_argument("--wipe-commits", action="store_true")
    parser.add_argument("--authorized", action="store_true")
    args = parser.parse_args()

    if not args.authorized:
        print("REFUSED: fault is safe-by-default; pass --authorized only during authorized runs", file=sys.stderr)
        return 2
    if stop_requested():
        print("REFUSED: STOP present", file=sys.stderr)
        return 2
    # re-check with authorized flag explicitly
    host = os.environ.get("MYSQL_HOST", "172.31.10.10")
    require_destructive_preflight(host=host, db=ALLOWED_DB, authorized=args.authorized)
    print(json.dumps(inject_fault(args.run_id, args.scenario, args.wipe_commits), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
