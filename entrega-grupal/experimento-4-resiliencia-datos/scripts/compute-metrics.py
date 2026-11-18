#!/usr/bin/env python3
"""RPO/RTO desde events.jsonl + alerts.jsonl (H6/H9/H11)."""
from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path


def parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def ms_between(a: datetime | None, b: datetime | None) -> float | None:
    if not a or not b:
        return None
    return (b - a).total_seconds() * 1000.0


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    if not path.exists():
        return rows
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        rows.append(json.loads(line))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--events", required=True)
    parser.add_argument("--alerts", default=None)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--scenario", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--backup-interval-sec", type=int, default=None)
    parser.add_argument("--probe-interval-sec", type=float, default=1.0)
    args = parser.parse_args()

    events_all = load_jsonl(Path(args.events))
    events = [e for e in events_all if e.get("run_id") == args.run_id and e.get("scenario") == args.scenario]

    alerts_path = Path(args.alerts) if args.alerts else Path(args.events).with_name("alerts.jsonl")
    alerts_all = load_jsonl(alerts_path)
    alerts = [
        a
        for a in alerts_all
        if a.get("run_id") == args.run_id and a.get("scenario") == args.scenario
    ]

    def first(etype: str, rows: list[dict] | None = None) -> dict | None:
        for ev in rows if rows is not None else events:
            if ev.get("event_type") == etype or ev.get("alert_type") == etype:
                return ev
        return None

    def last_matching(etype: str, pred=None) -> dict | None:
        found = None
        for ev in events:
            if ev.get("event_type") != etype:
                continue
            if pred and not pred(ev):
                continue
            found = ev
        return found

    fault = first("fault_injected") or first("fault_completed")
    # H6: detección real desde alerts del monitor
    detect = None
    for a in alerts:
        if a.get("alert_type") == "lab_event_observed" and a.get("correlated_event_type") in {
            "fault_injected",
            "fault_completed",
        }:
            detect = a
            break

    restore_start = first("restore_started")
    restore_end = first("restore_completed")
    # H9: primera sonda OK / service_ok de probe tras restore
    service_ok = None
    restore_fin_ts = parse_ts((restore_end or {}).get("t_restore_fin") or (restore_end or {}).get("timestamp_utc"))
    for ev in events:
        if ev.get("event_type") != "service_ok":
            continue
        ts = parse_ts(ev.get("t_servicio_ok") or ev.get("timestamp_utc"))
        if restore_fin_ts and ts and ts < restore_fin_ts:
            continue
        service_ok = ev
        break

    restored_backup_id = (restore_end or {}).get("backup_id")
    # H11: correlacionar backup restaurado
    backup = None
    if restored_backup_id:
        backup = last_matching("backup_completed", lambda e: e.get("backup_id") == restored_backup_id)
    if backup is None:
        backup = last_matching("backup_completed")

    t_fault = parse_ts((fault or {}).get("t_fallo") or (fault or {}).get("timestamp_utc"))
    if detect:
        t_detect = parse_ts(detect.get("t_deteccion") or detect.get("timestamp_utc"))
        detection_status = "observed"
    else:
        t_detect = None
        detection_status = "not_observed"

    t_restore_inicio = parse_ts((restore_start or {}).get("t_restore_inicio") or (restore_start or {}).get("timestamp_utc"))
    t_restore_fin = restore_fin_ts
    t_servicio_ok = parse_ts((service_ok or {}).get("t_servicio_ok") or (service_ok or {}).get("timestamp_utc"))
    t_backup = parse_ts(
        (restore_end or {}).get("t_backup_restored")
        or (backup or {}).get("t_backup")
        or (backup or {}).get("timestamp_utc")
    )

    last_before = (fault or {}).get("last_commit_before_fault")
    commits_before = (fault or {}).get("commits_before")
    restored_count = (service_ok or {}).get("restored_commit_count")
    if restored_count is None and restore_end and isinstance(restore_end.get("integrity"), dict):
        restored_count = restore_end["integrity"].get("commit_count")

    lost_count = None
    if commits_before is not None and restored_count is not None:
        lost_count = max(0, int(commits_before) - int(restored_count))

    metrics = {
        "run_id": args.run_id,
        "scenario": args.scenario,
        "project": "seguridad-caos-exp4",
        "backup_id_restored": restored_backup_id,
        "backup_id_metrics_source": (backup or {}).get("backup_id"),
        "t_backup_utc": t_backup.isoformat().replace("+00:00", "Z") if t_backup else None,
        "t_fallo_utc": t_fault.isoformat().replace("+00:00", "Z") if t_fault else None,
        "t_deteccion_utc": t_detect.isoformat().replace("+00:00", "Z") if t_detect else None,
        "detection_status": detection_status,
        "t_restore_inicio_utc": t_restore_inicio.isoformat().replace("+00:00", "Z") if t_restore_inicio else None,
        "t_restore_fin_utc": t_restore_fin.isoformat().replace("+00:00", "Z") if t_restore_fin else None,
        "t_servicio_ok_utc": t_servicio_ok.isoformat().replace("+00:00", "Z") if t_servicio_ok else None,
        "rto_observed_ms": ms_between(t_fault, t_servicio_ok),
        "rpo_observed_from_backup_age_ms": ms_between(t_backup, t_fault),
        "rpo_objective_backup_interval_sec": args.backup_interval_sec,
        "probe_interval_sec": args.probe_interval_sec,
        "rto_uncertainty_note": "t_servicio_ok quantized by probe interval",
        "last_commit_before_fault": last_before,
        "last_restored_commit_id": (service_ok or {}).get("last_restored_commit_id")
        or ((restore_end or {}).get("integrity") or {}).get("last_commit_id"),
        "commits_before_fault": commits_before,
        "commits_restored": restored_count,
        "confirmed_commits_lost": lost_count,
        "integrity": (restore_end or {}).get("integrity"),
        "n": 1,
        "notes": [
            "Do not invent timestamps when events are missing (null).",
            "RPO loss (post-backup commits) is not restore corruption.",
            "R0 manual wait time is included when operator_restore gates t_restore_inicio.",
        ],
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
