"""Unit tests del watchdog — sin Docker."""

from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load():
    spec = importlib.util.spec_from_file_location("sec_watchdog", ROOT / "watchdog" / "watchdog.py")
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules["sec_watchdog"] = mod
    spec.loader.exec_module(mod)
    return mod


def test_idle_without_deadline(tmp_path, monkeypatch):
    wd = _load()
    monkeypatch.setattr(wd, "EVENTS_DIR", tmp_path)
    monkeypatch.setattr(wd, "DEADLINE_PATH", tmp_path / "experiment_deadline.json")
    monkeypatch.setattr(wd, "STOP_FLAG", tmp_path / "STOP")
    monkeypatch.setattr(wd, "ABORT_FLAG", tmp_path / "ABORT_PROBES")
    monkeypatch.setattr(wd, "AUDIT_PATH", tmp_path / "watchdog.jsonl")
    assert wd.maybe_enforce(None) == "idle_no_deadline"
    assert not (tmp_path / "STOP").exists()


def test_idle_inactive_does_not_stop(tmp_path, monkeypatch):
    wd = _load()
    monkeypatch.setattr(wd, "EVENTS_DIR", tmp_path)
    monkeypatch.setattr(wd, "DEADLINE_PATH", tmp_path / "experiment_deadline.json")
    monkeypatch.setattr(wd, "STOP_FLAG", tmp_path / "STOP")
    monkeypatch.setattr(wd, "ABORT_FLAG", tmp_path / "ABORT_PROBES")
    monkeypatch.setattr(wd, "AUDIT_PATH", tmp_path / "watchdog.jsonl")
    past = (datetime.now(timezone.utc) - timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    deadline = {"active": False, "deadline_utc": past, "run_id": "x"}
    assert wd.maybe_enforce(deadline) == "idle_inactive"
    assert not (tmp_path / "STOP").exists()


def test_expired_deadline_writes_stop(tmp_path, monkeypatch):
    wd = _load()
    monkeypatch.setattr(wd, "EVENTS_DIR", tmp_path)
    monkeypatch.setattr(wd, "DEADLINE_PATH", tmp_path / "experiment_deadline.json")
    monkeypatch.setattr(wd, "STOP_FLAG", tmp_path / "STOP")
    monkeypatch.setattr(wd, "ABORT_FLAG", tmp_path / "ABORT_PROBES")
    monkeypatch.setattr(wd, "AUDIT_PATH", tmp_path / "watchdog.jsonl")
    past = (datetime.now(timezone.utc) - timedelta(seconds=1)).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    deadline = {
        "active": True,
        "deadline_utc": past,
        "run_id": "run-expired",
        "created_utc": past,
        "max_minutes": 1,
    }
    (tmp_path / "experiment_deadline.json").write_text(json.dumps(deadline), encoding="utf-8")
    assert wd.maybe_enforce(deadline) == "expired_stop"
    assert (tmp_path / "STOP").exists()
    assert (tmp_path / "ABORT_PROBES").exists()
    saved = json.loads((tmp_path / "experiment_deadline.json").read_text(encoding="utf-8"))
    assert saved["active"] is False
    assert saved["deadline_utc"] == past  # plazo original conservado


def test_future_deadline_armed(tmp_path, monkeypatch):
    wd = _load()
    monkeypatch.setattr(wd, "EVENTS_DIR", tmp_path)
    monkeypatch.setattr(wd, "DEADLINE_PATH", tmp_path / "experiment_deadline.json")
    monkeypatch.setattr(wd, "STOP_FLAG", tmp_path / "STOP")
    monkeypatch.setattr(wd, "ABORT_FLAG", tmp_path / "ABORT_PROBES")
    monkeypatch.setattr(wd, "AUDIT_PATH", tmp_path / "watchdog.jsonl")
    future = (datetime.now(timezone.utc) + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    deadline = {"active": True, "deadline_utc": future, "run_id": "run-future"}
    assert wd.maybe_enforce(deadline) == "armed_waiting"
    assert not (tmp_path / "STOP").exists()
