"""Detector de eventos del lab (fault / restore / STOP). Sin red externa."""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def main() -> int:
    events = Path(os.environ.get("EVENTS_DIR", "/events")) / "events.jsonl"
    alerts = Path(os.environ.get("ALERTS_PATH", "/events/alerts.jsonl"))
    events.parent.mkdir(parents=True, exist_ok=True)
    alerts.parent.mkdir(parents=True, exist_ok=True)
    pos = 0
    boot = {
        "timestamp_utc": utc_now(),
        "alert_type": "monitor_started",
        "project": "seguridad-caos-exp4",
    }
    with alerts.open("a", encoding="utf-8") as af:
        af.write(json.dumps(boot) + "\n")

    interesting = {"fault_injected", "fault_completed", "restore_failed", "backup_failed"}
    while True:
        if (events.parent / "STOP").exists():
            # keep running but emit once per presence poll cadence
            pass
        if events.exists():
            data = events.read_bytes()
            if len(data) > pos:
                chunk = data[pos:]
                pos = len(data)
                for line in chunk.decode("utf-8", "replace").splitlines():
                    if not line.strip():
                        continue
                    try:
                        ev = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if ev.get("event_type") in interesting:
                        alert = {
                            "timestamp_utc": utc_now(),
                            "alert_type": "lab_event_observed",
                            "correlated_event_type": ev.get("event_type"),
                            "run_id": ev.get("run_id"),
                            "scenario": ev.get("scenario"),
                            "t_deteccion": utc_now(),
                            "source": "events.jsonl",
                            "independent_of_powershell": True,
                        }
                        with alerts.open("a", encoding="utf-8") as af:
                            af.write(json.dumps(alert) + "\n")
        time.sleep(0.5)


if __name__ == "__main__":
    raise SystemExit(main())
