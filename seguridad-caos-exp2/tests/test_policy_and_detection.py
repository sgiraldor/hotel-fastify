"""Pruebas unitarias puras — sin Docker, sin red, sin R0/R1."""

from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load(module_name: str, path: Path):
    spec = importlib.util.spec_from_file_location(module_name, path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)
    return mod


gateway = _load("sec_gateway", ROOT / "gateway" / "gateway.py")
detector = _load("sec_detector", ROOT / "detector" / "detector.py")
probe = _load("sec_probe", ROOT / "clients" / "probe.py")


def test_r0_permissive_allows_unauthorized():
    policy = {
        "mode": "permissive",
        "default_action": "allow",
        "allowed_sources": ["172.30.30.30"],
        "denied_sources": [],
    }
    action, reason = gateway.decide("172.30.20.40", policy)
    assert action == "allow"
    assert reason == "default_allow"


def test_r1_restrictive_denies_unauthorized():
    policy = {
        "mode": "restrictive",
        "default_action": "deny",
        "allowed_sources": ["172.30.30.30"],
        "denied_sources": ["172.30.20.40"],
    }
    action, reason = gateway.decide("172.30.20.40", policy)
    assert action == "deny"
    assert reason == "explicit_deny"


def test_r1_allows_legitimate():
    policy = {
        "mode": "restrictive",
        "default_action": "deny",
        "allowed_sources": ["172.30.30.30"],
        "denied_sources": ["172.30.20.40"],
    }
    action, reason = gateway.decide("172.30.30.30", policy)
    assert action == "allow"
    assert reason == "explicit_allow"


def test_detector_positive_unauthorized_deny():
    rule = {
        "match_event_type": "connection_denied",
        "match_action": "deny",
        "watch_sources": ["172.30.20.40"],
    }
    event = {
        "event_type": "connection_denied",
        "action": "deny",
        "src_ip": "172.30.20.40",
        "event_id": "evt-pos",
    }
    assert detector.match_rule(event, rule) is True


def test_detector_negative_legitimate_allow():
    rule = {
        "match_event_type": "connection_denied",
        "match_action": "deny",
        "watch_sources": ["172.30.20.40"],
    }
    event = {
        "event_type": "connection_allowed",
        "action": "allow",
        "src_ip": "172.30.30.30",
        "event_id": "evt-neg",
    }
    assert detector.match_rule(event, rule) is False


def test_mysql_greeting_heuristic():
    # length=10, seq=0, protocol=0x0a + payload
    pkt = bytes([10, 0, 0, 0, 0x0A]) + b"5.7.0-lab"
    assert probe.looks_like_mysql_greeting(pkt) is True
    assert probe.looks_like_mysql_greeting(b"HTTP/1.1") is False
    assert probe.looks_like_mysql_greeting(b"") is False


def _write_metrics_case(tmp: Path, events: list[dict], alerts: list[dict], **kwargs):
    metrics_mod = _load("sec_metrics_" + tmp.name, ROOT / "scripts" / "compute-metrics.py")
    ev = tmp / "events.jsonl"
    al = tmp / "alerts.jsonl"
    out = tmp / "metrics.json"
    ev.write_text("\n".join(json.dumps(e) for e in events) + "\n", encoding="utf-8")
    al.write_text("\n".join(json.dumps(a) for a in alerts) + "\n", encoding="utf-8")
    sys.argv = [
        "compute-metrics.py",
        "--events",
        str(ev),
        "--alerts",
        str(al),
        "--run-id",
        kwargs.get("run_id", "run-r1-1"),
        "--scenario",
        kwargs.get("scenario", "r1"),
        "--policy-id",
        kwargs.get("policy_id", "seguridad-caos-exp2-r1-restrictive"),
        "--out",
        str(out),
    ]
    assert metrics_mod.main() == 0
    return json.loads(out.read_text(encoding="utf-8"))


def test_compute_metrics_no_fictional_times():
    with tempfile.TemporaryDirectory() as tmp:
        data = _write_metrics_case(
            Path(tmp),
            events=[
                {
                    "event_type": "connection_attempt",
                    "src_ip": "172.30.20.40",
                    "timestamp_utc": "2026-11-17T12:00:00.000Z",
                    "event_id": "a1",
                    "run_id": "run-r0-1",
                    "scenario": "r0",
                    "policy_id": "seguridad-caos-exp2-r0-permissive",
                }
            ],
            alerts=[],
            run_id="run-r0-1",
            scenario="r0",
            policy_id="seguridad-caos-exp2-r0-permissive",
        )
        assert data["t0_attempt_utc"] == "2026-11-17T12:00:00.000Z"
        assert data["t1_detection_utc"] is None
        assert data["t2_containment_confirmed_utc"] is None
        assert data["mttd_ms"] is None
        assert data["mttc_ms"] is None
        assert data["containment_class"] == "not_observed"


def test_compute_metrics_isolates_mixed_runs():
    with tempfile.TemporaryDirectory() as tmp:
        data = _write_metrics_case(
            Path(tmp),
            events=[
                {
                    "event_type": "connection_attempt",
                    "src_ip": "172.30.20.40",
                    "timestamp_utc": "2026-11-17T11:00:00.000Z",
                    "event_id": "r0-a",
                    "run_id": "run-r0",
                    "scenario": "r0",
                    "policy_id": "seguridad-caos-exp2-r0-permissive",
                },
                {
                    "event_type": "connection_attempt",
                    "src_ip": "172.30.20.40",
                    "timestamp_utc": "2026-11-17T12:00:00.000Z",
                    "event_id": "r1-a",
                    "run_id": "run-r1",
                    "scenario": "r1",
                    "policy_id": "seguridad-caos-exp2-r1-restrictive",
                },
                {
                    "event_type": "connection_denied",
                    "src_ip": "172.30.20.40",
                    "timestamp_utc": "2026-11-17T12:00:00.050Z",
                    "event_id": "r1-d",
                    "run_id": "run-r1",
                    "scenario": "r1",
                    "policy_id": "seguridad-caos-exp2-r1-restrictive",
                },
            ],
            alerts=[
                {
                    "alert_type": "unauthorized_access_denied",
                    "src_ip": "172.30.20.40",
                    "timestamp_utc": "2026-11-17T12:00:00.200Z",
                    "alert_id": "al-1",
                    "run_id": "run-r1",
                    "scenario": "r1",
                    "policy_id": "seguridad-caos-exp2-r1-restrictive",
                }
            ],
            run_id="run-r1",
            scenario="r1",
            policy_id="seguridad-caos-exp2-r1-restrictive",
        )
        assert data["t0_attempt_utc"] == "2026-11-17T12:00:00.000Z"
        assert data["mttd_ms"] == 200.0
        assert data["mttc_ms"] == 50.0
        assert data["containment_class"] == "preventive"
        assert data["detection_coverage"] is True


def test_compute_metrics_dedup_and_out_of_order():
    with tempfile.TemporaryDirectory() as tmp:
        data = _write_metrics_case(
            Path(tmp),
            events=[
                {
                    "event_type": "connection_denied",
                    "src_ip": "172.30.20.40",
                    "timestamp_utc": "2026-11-17T12:00:02.000Z",
                    "event_id": "d-new",
                    "run_id": "run-r1",
                    "scenario": "r1",
                    "policy_id": "seguridad-caos-exp2-r1-restrictive",
                },
                {
                    "event_type": "connection_attempt",
                    "src_ip": "172.30.20.40",
                    "timestamp_utc": "2026-11-17T12:00:01.000Z",
                    "event_id": "a1",
                    "run_id": "run-r1",
                    "scenario": "r1",
                    "policy_id": "seguridad-caos-exp2-r1-restrictive",
                },
                # duplicado
                {
                    "event_type": "connection_attempt",
                    "src_ip": "172.30.20.40",
                    "timestamp_utc": "2026-11-17T12:00:01.000Z",
                    "event_id": "a1",
                    "run_id": "run-r1",
                    "scenario": "r1",
                    "policy_id": "seguridad-caos-exp2-r1-restrictive",
                },
            ],
            alerts=[],
            run_id="run-r1",
            scenario="r1",
            policy_id="seguridad-caos-exp2-r1-restrictive",
        )
        assert data["t0_attempt_utc"] == "2026-11-17T12:00:01.000Z"
        assert data["t2_containment_confirmed_utc"] == "2026-11-17T12:00:02.000Z"
        assert data["mttd_ms"] is None
        assert data["mttc_ms"] == 1000.0
