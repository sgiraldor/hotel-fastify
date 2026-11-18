"""Sonda independiente de disponibilidad del MySQL sintético (H9).

Frecuencia por defecto: 1s (incertidumbre temporal ~+/- 1s en t_servicio_ok).
Solo host allowlist del lab. Sin Hotel MySQL.
"""
from __future__ import annotations

import argparse
import os
import time

import pymysql

from common_events import append_event, assert_host_allowed, stop_requested, utc_now
from lab_identity import ALLOWED_DB, ALLOWED_PROJECT, LAB_META_PROJECT_KEY


def probe_once(run_id: str, scenario: str, min_commits: int | None) -> dict:
    host = os.environ.get("MYSQL_HOST", "172.31.10.10")
    assert_host_allowed(host)
    try:
        conn = pymysql.connect(
            host=host,
            port=int(os.environ.get("MYSQL_PORT", "3306")),
            user=os.environ.get("MYSQL_USER", "lab_resilience_app"),
            password=os.environ.get("MYSQL_PASSWORD", "lab-exp4-app-not-real"),
            database=ALLOWED_DB,
            connect_timeout=3,
        )
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
            cur.execute("SELECT v FROM lab_meta WHERE k=%s", (LAB_META_PROJECT_KEY,))
            project = cur.fetchone()
            cur.execute("SELECT COUNT(*) FROM synthetic_commits WHERE run_id=%s", (run_id,))
            count = int(cur.fetchone()[0])
        conn.close()
        ok = bool(project and project[0] == ALLOWED_PROJECT)
        if min_commits is not None:
            ok = ok and count >= min_commits
        return {"ok": ok, "commit_count": count, "project": project[0] if project else None}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--scenario", required=True)
    parser.add_argument("--interval-sec", type=float, default=1.0)
    parser.add_argument("--min-commits", type=int, default=None)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    append_event(
        "probe_started",
        run_id=args.run_id,
        scenario=args.scenario,
        interval_sec=args.interval_sec,
        uncertainty_note="t_servicio_ok resolution approx +/- interval_sec",
    )
    while True:
        if stop_requested() and not args.once:
            append_event("probe_stopped", run_id=args.run_id, scenario=args.scenario)
            return 0
        result = probe_once(args.run_id, args.scenario, args.min_commits)
        append_event(
            "service_probe",
            run_id=args.run_id,
            scenario=args.scenario,
            probe_ok=result.get("ok"),
            commit_count=result.get("commit_count"),
            timestamp_utc=utc_now(),
        )
        if result.get("ok"):
            append_event(
                "service_ok",
                run_id=args.run_id,
                scenario=args.scenario,
                t_servicio_ok=utc_now(),
                restored_commit_count=result.get("commit_count"),
                source="independent_probe",
            )
            if args.once:
                return 0
        if args.once:
            return 1
        time.sleep(max(0.2, args.interval_sec))


if __name__ == "__main__":
    raise SystemExit(main())
