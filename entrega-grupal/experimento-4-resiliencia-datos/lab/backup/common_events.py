"""Eventos JSONL UTC compartidos (lab seguridad-caos-exp4)."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def events_dir() -> Path:
    return Path(os.environ.get("EVENTS_DIR", "/events"))


def stop_requested() -> bool:
    return (events_dir() / "STOP").exists()


def append_event(event_type: str, **fields: Any) -> dict[str, Any]:
    payload = {
        "timestamp_utc": utc_now(),
        "project": "seguridad-caos-exp4",
        "event_type": event_type,
        **fields,
    }
    path = events_dir() / "events.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, ensure_ascii=False) + "\n")
    return payload


def assert_allowed_db(name: str) -> None:
    allowed = os.environ.get("ALLOWED_DB", "lab_resilience_db")
    if name != allowed:
        raise SystemExit(f"REFUSED: database '{name}' not allowed (expected {allowed})")
