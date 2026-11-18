"""Eventos JSONL UTC + validación de destino inmutable."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from lab_identity import (
    ALLOWED_DB,
    ALLOWED_HOSTS,
    ALLOWED_PROJECT,
    LAB_META_DB_KEY,
    LAB_META_PROJECT_KEY,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def events_dir() -> Path:
    return Path(os.environ.get("EVENTS_DIR", "/events"))


def stop_requested() -> bool:
    return (events_dir() / "STOP").exists()


def append_event(event_type: str, **fields: Any) -> dict[str, Any]:
    payload = {
        "timestamp_utc": utc_now(),
        "project": ALLOWED_PROJECT,
        "event_type": event_type,
        **fields,
    }
    path = events_dir() / "events.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, ensure_ascii=False) + "\n")
    return payload


def assert_db_name(name: str) -> None:
    if name != ALLOWED_DB:
        raise SystemExit(f"REFUSED: database '{name}' != immutable {ALLOWED_DB}")


def assert_host_allowed(host: str) -> None:
    if host not in ALLOWED_HOSTS:
        raise SystemExit(f"REFUSED: host '{host}' not in immutable allowlist")


def assert_lab_identity_row(project_value: str | None, db_value: str | None = None) -> None:
    if project_value != ALLOWED_PROJECT:
        raise SystemExit("REFUSED: lab_meta.project mismatch (immutable check)")
    if db_value is not None and db_value != ALLOWED_DB:
        raise SystemExit("REFUSED: lab_meta.db_name mismatch (immutable check)")


def require_destructive_preflight(*, host: str, db: str, authorized: bool) -> None:
    if not authorized:
        raise SystemExit("REFUSED: destructive op requires --authorized")
    if stop_requested():
        raise SystemExit("REFUSED: STOP present")
    assert_host_allowed(host)
    assert_db_name(db)
