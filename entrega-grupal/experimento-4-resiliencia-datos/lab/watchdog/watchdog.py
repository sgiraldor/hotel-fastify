"""Watchdog TTL de corrida: lee deadline persistente, escribe STOP.

No termina VMs OCI ni ejecuta terraform destroy. La vida de infra Exp4 (≥9h)
es independiente de este TTL. Sin socket Docker ni red externa.
"""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def parse_deadline(raw: str) -> datetime:
    return datetime.fromisoformat(raw.replace("Z", "+00:00"))


def main() -> int:
    events = Path(os.environ.get("EVENTS_DIR", "/events"))
    deadline_path = Path(os.environ.get("DEADLINE_PATH", str(events / "experiment_deadline.json")))
    stop_path = Path(os.environ.get("STOP_PATH", str(events / "STOP")))
    audit = Path(os.environ.get("AUDIT_PATH", str(events / "watchdog.jsonl")))
    heartbeat = Path(os.environ.get("HEARTBEAT_PATH", str(events / "watchdog_heartbeat.json")))
    wid = os.environ.get("WATCHDOG_ID", "seguridad-caos-exp4-watchdog")
    events.mkdir(parents=True, exist_ok=True)

    def audit_line(state: str, **extra):
        row = {"timestamp_utc": utc_now(), "watchdog_id": wid, "state": state, **extra}
        with audit.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(row) + "\n")

    audit_line("started")
    while True:
        active = False
        deadline_utc = None
        run_id = None
        if deadline_path.exists():
            try:
                meta = json.loads(deadline_path.read_text(encoding="utf-8"))
                deadline_utc = meta.get("deadline_utc")
                run_id = meta.get("run_id")
                active = bool(meta.get("active", True))
            except Exception as exc:  # noqa: BLE001
                audit_line("deadline_parse_error", error=str(exc))
        now = datetime.now(timezone.utc)
        healthy = True
        state = "armed_waiting"
        if active and deadline_utc:
            try:
                dl = parse_deadline(deadline_utc)
                if now >= dl and not stop_path.exists():
                    stop_path.write_text(
                        f"project=seguridad-caos-exp4\nreason=ttl_expired\nrun_id={run_id}\nutc={utc_now()}\n",
                        encoding="utf-8",
                    )
                    state = "stop_written_ttl"
                    audit_line(state, run_id=run_id, deadline_utc=deadline_utc)
                else:
                    state = "armed_waiting"
            except Exception as exc:  # noqa: BLE001
                healthy = False
                state = "deadline_invalid"
                audit_line(state, error=str(exc))
        if stop_path.exists():
            state = "stop_present"
        heartbeat.write_text(
            json.dumps(
                {
                    "watchdog_id": wid,
                    "timestamp_utc": utc_now(),
                    "state": state,
                    "healthy": healthy,
                    "active_experiment": active,
                    "run_id": run_id,
                    "deadline_utc": deadline_utc,
                }
            ),
            encoding="utf-8",
        )
        time.sleep(1.0)


if __name__ == "__main__":
    raise SystemExit(main())
