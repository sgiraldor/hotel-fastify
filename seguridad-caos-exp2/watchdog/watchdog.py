#!/usr/bin/env python3
"""Watchdog autónomo del laboratorio seguridad-caos-exp2.

Independiente de PowerShell. Sin Docker socket. Sin privilegios. Sin egreso.
Lee experiment_deadline.json (plazo persistido). No reinicia el plazo al arrancar.
Si el plazo ya venció → STOP inmediato.
Sin experimento activo (active=false o sin archivo) → idle, no escribe STOP.
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

EVENTS_DIR = Path(os.environ.get("EVENTS_DIR", "/events"))
DEADLINE_PATH = Path(os.environ.get("DEADLINE_PATH", str(EVENTS_DIR / "experiment_deadline.json")))
STOP_FLAG = Path(os.environ.get("STOP_FLAG", str(EVENTS_DIR / "STOP")))
ABORT_FLAG = Path(os.environ.get("ABORT_FLAG", str(EVENTS_DIR / "ABORT_PROBES")))
HEARTBEAT_PATH = Path(os.environ.get("HEARTBEAT_PATH", str(EVENTS_DIR / "watchdog_heartbeat.json")))
AUDIT_PATH = Path(os.environ.get("AUDIT_PATH", str(EVENTS_DIR / "watchdog.jsonl")))
POLL_SECONDS = float(os.environ.get("POLL_SECONDS", "1.0"))
HEARTBEAT_MAX_AGE_HINT = float(os.environ.get("HEARTBEAT_MAX_AGE_HINT", "5.0"))
WATCHDOG_ID = os.environ.get("WATCHDOG_ID", "seguridad-caos-exp2-watchdog")


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def parse_ts(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def emit_audit(event_type: str, **fields: Any) -> None:
    EVENTS_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "watchdog_id": WATCHDOG_ID,
        "timestamp_utc": utc_now(),
        "event_type": event_type,
        **fields,
    }
    with AUDIT_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, ensure_ascii=False) + "\n")
        fh.flush()


def write_heartbeat(state: str, deadline: dict[str, Any] | None) -> None:
    payload = {
        "watchdog_id": WATCHDOG_ID,
        "timestamp_utc": utc_now(),
        "state": state,
        "healthy": True,
        "deadline_path": str(DEADLINE_PATH),
        "active_experiment": bool(deadline and deadline.get("active") is True),
        "run_id": (deadline or {}).get("run_id"),
        "deadline_utc": (deadline or {}).get("deadline_utc"),
        "heartbeat_max_age_hint_sec": HEARTBEAT_MAX_AGE_HINT,
    }
    HEARTBEAT_PATH.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")


def load_deadline() -> dict[str, Any] | None:
    if not DEADLINE_PATH.exists():
        return None
    try:
        data = json.loads(DEADLINE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        emit_audit("watchdog_deadline_read_error", error=str(exc))
        return None
    if not isinstance(data, dict):
        return None
    return data


def write_stop(reason: str, deadline: dict[str, Any] | None) -> None:
    content = (
        f"stopped_at_utc={utc_now()}\n"
        f"reason={reason}\n"
        f"project=seguridad-caos-exp2\n"
        f"source=watchdog\n"
        f"run_id={(deadline or {}).get('run_id')}\n"
    )
    STOP_FLAG.write_text(content, encoding="utf-8")
    ABORT_FLAG.write_text(
        json.dumps(
            {
                "abort": True,
                "reason": reason,
                "timestamp_utc": utc_now(),
                "run_id": (deadline or {}).get("run_id"),
            },
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    emit_audit(
        "watchdog_stop_activated",
        reason=reason,
        run_id=(deadline or {}).get("run_id"),
        deadline_utc=(deadline or {}).get("deadline_utc"),
        stop_path=str(STOP_FLAG),
        abort_path=str(ABORT_FLAG),
    )


def deactivate_deadline(deadline: dict[str, Any], reason: str) -> None:
    """Marca el experimento inactivo sin reescribir el plazo original."""
    updated = dict(deadline)
    updated["active"] = False
    updated["deactivated_utc"] = utc_now()
    updated["deactivate_reason"] = reason
    # Conservar deadline_utc original — no se reinicia.
    DEADLINE_PATH.write_text(json.dumps(updated, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def maybe_enforce(deadline: dict[str, Any] | None) -> str:
    if deadline is None:
        return "idle_no_deadline"
    if deadline.get("active") is not True:
        return "idle_inactive"
    deadline_utc = deadline.get("deadline_utc")
    if not deadline_utc:
        emit_audit("watchdog_deadline_missing_field", run_id=deadline.get("run_id"))
        return "idle_invalid"
    try:
        due = parse_ts(str(deadline_utc))
    except ValueError as exc:
        emit_audit("watchdog_deadline_parse_error", error=str(exc))
        return "idle_invalid"

    now = datetime.now(timezone.utc)
    if now >= due:
        if not STOP_FLAG.exists():
            write_stop("deadline_expired", deadline)
        else:
            emit_audit(
                "watchdog_deadline_expired_stop_present",
                run_id=deadline.get("run_id"),
                deadline_utc=deadline_utc,
            )
        if deadline.get("active") is True:
            deactivate_deadline(deadline, "deadline_expired")
        return "expired_stop"
    return "armed_waiting"


def main() -> None:
    EVENTS_DIR.mkdir(parents=True, exist_ok=True)
    emit_audit("watchdog_started", poll_seconds=POLL_SECONDS, deadline_path=str(DEADLINE_PATH))

    # Arranque: si ya venció, STOP inmediato (sin reiniciar plazo).
    initial = load_deadline()
    state = maybe_enforce(initial)
    write_heartbeat(state, initial)
    if state == "expired_stop":
        emit_audit("watchdog_boot_deadline_already_expired", run_id=(initial or {}).get("run_id"))

    while True:
        deadline = load_deadline()
        state = maybe_enforce(deadline)
        write_heartbeat(state, deadline)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
