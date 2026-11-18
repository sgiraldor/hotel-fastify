"""Genera commits sintéticos con secuencia monotónica y ledger append-only (H5/H7)."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import uuid
from pathlib import Path

import pymysql

from common_events import (
    append_event,
    assert_db_name,
    assert_host_allowed,
    assert_lab_identity_row,
    stop_requested,
    utc_now,
)
from lab_identity import ALLOWED_DB, LAB_META_DB_KEY, LAB_META_PROJECT_KEY


def connect():
    host = os.environ.get("MYSQL_HOST", "172.31.10.10")
    assert_host_allowed(host)
    assert_db_name(ALLOWED_DB)
    return pymysql.connect(
        host=host,
        port=int(os.environ.get("MYSQL_PORT", "3306")),
        user=os.environ.get("MYSQL_USER", "lab_resilience_app"),
        password=os.environ.get("MYSQL_PASSWORD", "lab-exp4-app-not-real"),
        database=ALLOWED_DB,
        charset="utf8mb4",
        autocommit=True,
        connect_timeout=10,
    )


def append_ledger(row: dict) -> None:
    evidence = Path(os.environ.get("EVIDENCE_DIR", "/evidence"))
    evidence.mkdir(parents=True, exist_ok=True)
    # H5: append-only ledger (nunca sobrescribir historial completo)
    ledger = evidence / "commits_ledger.jsonl"
    with ledger.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    # Oleada única por archivo (no pisa ledger)
    wave = evidence / f"commits-wave-{row['run_id']}-seq-{row['seq']:05d}.json"
    wave.write_text(json.dumps(row, indent=2), encoding="utf-8")


def write_commits(run_id: str, scenario: str, count: int, interval_ms: int, seq_start: int) -> list[dict]:
    written: list[dict] = []
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT v FROM lab_meta WHERE k=%s", (LAB_META_PROJECT_KEY,))
            project = cur.fetchone()
            cur.execute("SELECT v FROM lab_meta WHERE k=%s", (LAB_META_DB_KEY,))
            dbmeta = cur.fetchone()
            assert_lab_identity_row(project[0] if project else None, dbmeta[0] if dbmeta else None)

            for i in range(count):
                if stop_requested():
                    append_event("generator_aborted_stop", run_id=run_id, scenario=scenario)
                    break
                seq = seq_start + i
                commit_id = f"c-{uuid.uuid4().hex[:16]}"
                ts = utc_now()
                payload = f"synthetic-{scenario}-seq{seq}"
                mysql_ts = ts.replace("T", " ").replace("Z", "")
                cur.execute(
                    """
                    INSERT INTO synthetic_commits
                      (commit_id, run_id, scenario, payload, committed_at_utc)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (commit_id, run_id, scenario, payload, mysql_ts),
                )
                row = {
                    "commit_id": commit_id,
                    "run_id": run_id,
                    "scenario": scenario,
                    "seq": seq,
                    "payload": payload,
                    "committed_at_utc": ts,
                    "confirmed": True,
                }
                written.append(row)
                append_ledger(row)
                append_event(
                    "commit_confirmed",
                    run_id=run_id,
                    scenario=scenario,
                    commit_id=commit_id,
                    seq=seq,
                    committed_at_utc=ts,
                    confirmed=True,
                )
                if interval_ms > 0 and i + 1 < count:
                    time.sleep(interval_ms / 1000.0)
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="Synthetic commit generator (lab only)")
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--scenario", required=True, choices=["r0", "r1", "smoke"])
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--interval-ms", type=int, default=250)
    parser.add_argument("--seq-start", type=int, default=1)
    args = parser.parse_args()

    if stop_requested():
        print("STOP present; refusing to write", file=sys.stderr)
        return 2

    append_event(
        "generator_started",
        run_id=args.run_id,
        scenario=args.scenario,
        seq_start=args.seq_start,
        count=args.count,
    )
    rows = write_commits(args.run_id, args.scenario, args.count, args.interval_ms, args.seq_start)
    append_event(
        "generator_finished",
        run_id=args.run_id,
        scenario=args.scenario,
        commits_written=len(rows),
        seq_start=args.seq_start,
        seq_end=(rows[-1]["seq"] if rows else None),
    )
    print(json.dumps({"ok": True, "commits": len(rows), "seq_start": args.seq_start}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
