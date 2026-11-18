#!/usr/bin/env python3
"""Métricas aisladas por run_id / scenario / policy_id. No inventa tiempos.

Contención:
  - preventive: deny del proxy antes de abrir upstream (t2 puede ser < t1)
  - reactive: no modelada en este laboratorio
  - not_observed / null: sin evidencia
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Any


def parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def delta_ms(a: datetime | None, b: datetime | None) -> float | None:
    if a is None or b is None:
        return None
    return (b - a).total_seconds() * 1000.0


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def matches_scope(row: dict[str, Any], run_id: str | None, scenario: str | None, policy_id: str | None) -> bool:
    if run_id and row.get("run_id") != run_id:
        return False
    if scenario and row.get("scenario") != scenario:
        return False
    if policy_id and row.get("policy_id") != policy_id:
        return False
    return True


def pick_latest(rows: list[dict[str, Any]], predicate) -> dict[str, Any] | None:
    matched = [r for r in rows if predicate(r)]
    if not matched:
        return None

    def sort_key(r: dict[str, Any]):
        ts = parse_ts(r.get("timestamp_utc"))
        return ts or datetime.min.replace(tzinfo=None)

    # Fuera de orden temporal: elegimos el más reciente por timestamp_utc
    return sorted(matched, key=sort_key)[-1]


def dedupe_by_event_id(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for r in rows:
        eid = str(r.get("event_id") or r.get("alert_id") or "")
        if eid and eid in seen:
            continue
        if eid:
            seen.add(eid)
        out.append(r)
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--events", type=Path, required=True)
    parser.add_argument("--alerts", type=Path, required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--scenario", required=True, choices=["r0", "r1"])
    parser.add_argument("--policy-id", required=True)
    parser.add_argument("--unauthorized-src", default="172.30.20.40")
    parser.add_argument("--legitimate-src", default="172.30.30.30")
    parser.add_argument("--probe-unauthorized", type=Path, default=None)
    parser.add_argument("--probe-legitimate", type=Path, default=None)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    events = dedupe_by_event_id(
        [e for e in load_jsonl(args.events) if matches_scope(e, args.run_id, args.scenario, args.policy_id)]
    )
    alerts = dedupe_by_event_id(
        [a for a in load_jsonl(args.alerts) if matches_scope(a, args.run_id, args.scenario, args.policy_id)]
    )

    attempt = pick_latest(
        events,
        lambda e: e.get("event_type") == "connection_attempt" and e.get("src_ip") == args.unauthorized_src,
    )
    deny = pick_latest(
        events,
        lambda e: e.get("event_type") == "connection_denied" and e.get("src_ip") == args.unauthorized_src,
    )
    allow_u = pick_latest(
        events,
        lambda e: e.get("event_type") == "connection_allowed" and e.get("src_ip") == args.unauthorized_src,
    )
    alert = pick_latest(
        alerts,
        lambda a: a.get("alert_type") == "unauthorized_access_denied"
        and a.get("src_ip") == args.unauthorized_src,
    )

    t0 = parse_ts(attempt.get("timestamp_utc") if attempt else None)
    t1 = parse_ts(alert.get("timestamp_utc") if alert else None)
    t2 = parse_ts(deny.get("timestamp_utc") if deny else None)

    probe_u: dict[str, Any] = {}
    probe_l: dict[str, Any] = {}
    if args.probe_unauthorized and args.probe_unauthorized.exists():
        probe_u = json.loads(args.probe_unauthorized.read_text(encoding="utf-8"))
    if args.probe_legitimate and args.probe_legitimate.exists():
        probe_l = json.loads(args.probe_legitimate.read_text(encoding="utf-8"))

    detection_coverage = bool(alert) and bool(deny)
    false_positive = any(
        a.get("alert_type") == "unauthorized_access_denied" and a.get("src_ip") == args.legitimate_src
        for a in alerts
    )

    if deny:
        containment_class = "preventive"
    else:
        containment_class = "not_observed"

    metrics = {
        "run_id": args.run_id,
        "scenario": args.scenario,
        "policy_id": args.policy_id,
        "t0_attempt_utc": attempt.get("timestamp_utc") if attempt else None,
        "t1_detection_utc": alert.get("timestamp_utc") if alert else None,
        "t2_containment_confirmed_utc": deny.get("timestamp_utc") if deny else None,
        "mttd_ms": delta_ms(t0, t1),
        "mttc_ms": delta_ms(t0, t2),
        "detection_coverage": detection_coverage,
        "false_positives_legitimate_alerted": false_positive,
        "unauthorized_tcp_connected": probe_u.get("tcp_connected"),
        "unauthorized_mysql_greeting_received": probe_u.get("mysql_greeting_received"),
        "unauthorized_access_blocked": probe_u.get("access_blocked"),
        "unauthorized_upstream_allowed_event": bool(allow_u),
        "unauthorized_denied_event": bool(deny),
        "legitimate_tcp_connected": probe_l.get("tcp_connected"),
        "legitimate_mysql_greeting_received": probe_l.get("mysql_greeting_received"),
        "containment_class": containment_class,
        "containment_reactive": False,
        "notes": [
            "Filtrado estricto por run_id + scenario + policy_id.",
            "Si t1/t2 son null, no se asigna tiempo ficticio.",
            "Contención preventiva: deny del proxy post-accept, pre-upstream.",
            "Contención reactiva: no modelada.",
            "tcp_connected != mysql_greeting_received != auth != acceso a datos.",
        ],
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(metrics, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(metrics, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
