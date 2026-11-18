#!/usr/bin/env python3
"""Detector basado en eventos del gateway (independiente de la sonda)."""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

EVENTS_PATH = Path(os.environ.get("EVENTS_PATH", "/events/events.jsonl"))
ALERTS_PATH = Path(os.environ.get("ALERTS_PATH", "/events/alerts.jsonl"))
RULES_PATH = Path(os.environ.get("RULES_PATH", "/rules/unauthorized_deny.yaml"))
RUN_CONTEXT_PATH = Path(os.environ.get("RUN_CONTEXT_PATH", "/events/run_context.json"))
DETECTOR_ID = os.environ.get("DETECTOR_ID", "seguridad-caos-exp2-detector")
POLL_SECONDS = float(os.environ.get("POLL_SECONDS", "0.5"))
STOP_FLAG = Path(os.environ.get("STOP_FLAG", "/events/STOP"))


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def load_rule() -> dict[str, Any]:
    with RULES_PATH.open(encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def load_run_context() -> dict[str, Any]:
    if not RUN_CONTEXT_PATH.exists():
        return {}
    try:
        return json.loads(RUN_CONTEXT_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def match_rule(event: dict[str, Any], rule: dict[str, Any]) -> bool:
    if event.get("event_type") != rule.get("match_event_type"):
        return False
    if rule.get("match_action") and event.get("action") != rule.get("match_action"):
        return False
    src = event.get("src_ip")
    watched = rule.get("watch_sources") or []
    if watched and src not in watched:
        return False
    return True


def emit_alert(alert: dict[str, Any]) -> None:
    ALERTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    ctx = load_run_context()
    payload = {
        "detector_id": DETECTOR_ID,
        "timestamp_utc": utc_now(),
        "run_id": alert.get("run_id") or ctx.get("run_id"),
        "scenario": alert.get("scenario") or ctx.get("scenario"),
        "policy_id": alert.get("policy_id") or ctx.get("policy_id"),
        **alert,
    }
    with ALERTS_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, ensure_ascii=False) + "\n")
        fh.flush()


def follow() -> None:
    rule = load_rule()
    EVENTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    EVENTS_PATH.touch(exist_ok=True)
    ALERTS_PATH.touch(exist_ok=True)

    emit_alert(
        {
            "alert_id": f"detector-boot-{int(time.time())}",
            "alert_type": "detector_started",
            "rule_id": rule.get("rule_id"),
            "severity": "info",
        }
    )

    offset = 0
    seen: set[str] = set()

    while True:
        if STOP_FLAG.exists():
            emit_alert(
                {
                    "alert_id": f"detector-stop-{int(time.time())}",
                    "alert_type": "detector_stop_flag",
                    "severity": "info",
                    "stop_flag": str(STOP_FLAG),
                }
            )
            break

        rule = load_rule()
        with EVENTS_PATH.open("r", encoding="utf-8") as fh:
            fh.seek(offset)
            # Usar readline() en lugar de iterar el archivo: tell() falla tras next() en Py3.14+
            while True:
                pos = fh.tell()
                line = fh.readline()
                if not line:
                    offset = pos
                    break
                offset = fh.tell()
                line = line.strip()
                if not line:
                    continue
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue
                eid = str(event.get("event_id", ""))
                if not eid or eid in seen:
                    continue
                if not match_rule(event, rule):
                    continue
                seen.add(eid)
                emit_alert(
                    {
                        "alert_id": f"alert-{eid}",
                        "alert_type": rule.get("alert_type", "unauthorized_access_denied"),
                        "severity": rule.get("severity", "high"),
                        "rule_id": rule.get("rule_id"),
                        "correlated_event_id": eid,
                        "correlated_attempt_id": event.get("correlated_attempt_id")
                        or event.get("event_id"),
                        "src_ip": event.get("src_ip"),
                        "run_id": event.get("run_id"),
                        "scenario": event.get("scenario"),
                        "policy_id": event.get("policy_id"),
                        "detection_source": "gateway_events",
                        "independent_of_probe": True,
                        "message": rule.get(
                            "message",
                            "Denied unauthorized forwarding attempt at L4 proxy control point",
                        ),
                    }
                )
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    follow()
