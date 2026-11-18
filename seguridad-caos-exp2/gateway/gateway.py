#!/usr/bin/env python3
"""Punto de control TCP L4 del laboratorio seguridad-caos-exp2.

Importante (H1): accept() completa el handshake TCP hacia el gateway ANTES de
evaluar la política. Un deny NO es bloqueo de paquetes pre-handshake: es
rechazo de reenvío hacia MySQL (control de acceso por proxy).
"""

from __future__ import annotations

import json
import os
import select
import socket
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

LISTEN_HOST = os.environ.get("LISTEN_HOST", "0.0.0.0")
LISTEN_PORT = int(os.environ.get("LISTEN_PORT", "3306"))
MYSQL_HOST = os.environ.get("MYSQL_HOST", "172.30.10.10")
MYSQL_PORT = int(os.environ.get("MYSQL_PORT", "3306"))
POLICY_PATH = Path(os.environ.get("POLICY_PATH", "/policy/active.yaml"))
EVENTS_PATH = Path(os.environ.get("EVENTS_PATH", "/events/events.jsonl"))
RUN_CONTEXT_PATH = Path(os.environ.get("RUN_CONTEXT_PATH", "/events/run_context.json"))
STOP_FLAG = Path(os.environ.get("STOP_FLAG", "/events/STOP"))
GATEWAY_ID = os.environ.get("GATEWAY_ID", "seguridad-caos-exp2-gateway")


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def load_run_context() -> dict[str, Any]:
    if not RUN_CONTEXT_PATH.exists():
        return {
            "run_id": "unscoped",
            "scenario": "unknown",
            "policy_id": None,
        }
    try:
        return json.loads(RUN_CONTEXT_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {
            "run_id": "unscoped",
            "scenario": "unknown",
            "policy_id": None,
        }


def emit_event(event: dict[str, Any]) -> None:
    EVENTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    ctx = load_run_context()
    payload = {
        "gateway_id": GATEWAY_ID,
        "timestamp_utc": utc_now(),
        "run_id": ctx.get("run_id"),
        "scenario": ctx.get("scenario"),
        "policy_id": event.get("policy_id") or ctx.get("policy_id"),
        **event,
    }
    # Evitar sobrescribir policy_id del evento con None del contexto
    if payload.get("policy_id") is None:
        payload["policy_id"] = ctx.get("policy_id")
    with EVENTS_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, ensure_ascii=False) + "\n")
        fh.flush()


def load_policy() -> dict[str, Any]:
    if not POLICY_PATH.exists():
        return {
            "mode": "permissive",
            "default_action": "allow",
            "allowed_sources": [],
            "denied_sources": [],
            "policy_id": None,
        }
    with POLICY_PATH.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    return data


def ip_in_list(ip: str, entries: list[str] | None) -> bool:
    if not entries:
        return False
    return ip in entries


def decide(src_ip: str, policy: dict[str, Any]) -> tuple[str, str]:
    denied = policy.get("denied_sources") or []
    allowed = policy.get("allowed_sources") or []
    default = (policy.get("default_action") or "deny").lower()
    mode = (policy.get("mode") or "restrictive").lower()

    if ip_in_list(src_ip, denied):
        return "deny", "explicit_deny"
    if ip_in_list(src_ip, allowed):
        return "allow", "explicit_allow"
    if mode == "permissive" or default == "allow":
        return "allow", "default_allow"
    return "deny", "default_deny"


def pipe(a: socket.socket, b: socket.socket) -> None:
    sockets = [a, b]
    try:
        while True:
            readable, _, errored = select.select(sockets, [], sockets, 30.0)
            if errored:
                break
            if not readable:
                break
            for sock in readable:
                other = b if sock is a else a
                data = sock.recv(65536)
                if not data:
                    return
                other.sendall(data)
    except OSError:
        return
    finally:
        for sock in (a, b):
            try:
                sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            try:
                sock.close()
            except OSError:
                pass


def handle_client(client: socket.socket, addr: tuple[str, int]) -> None:
    src_ip, src_port = addr[0], addr[1]
    policy = load_policy()
    action, reason = decide(src_ip, policy)
    event_id = f"evt-{uuid.uuid4().hex[:12]}-{src_port}"

    # El handshake TCP con el gateway YA ocurrió (accept). Esto NO es drop pre-handshake.
    emit_event(
        {
            "event_id": event_id,
            "event_type": "connection_attempt",
            "src_ip": src_ip,
            "src_port": src_port,
            "dst_host": MYSQL_HOST,
            "dst_port": MYSQL_PORT,
            "listen_port": LISTEN_PORT,
            "action": action,
            "reason": reason,
            "policy_mode": policy.get("mode"),
            "policy_id": policy.get("policy_id"),
            "layer": "proxy_l4_access_control",
            "tcp_handshake_with_gateway": True,
            "pre_handshake_packet_drop": False,
            "note": "TCP accept completed before policy evaluation",
        }
    )

    if action == "deny":
        emit_event(
            {
                "event_id": f"{event_id}-deny",
                "event_type": "connection_denied",
                "correlated_attempt_id": event_id,
                "src_ip": src_ip,
                "src_port": src_port,
                "dst_host": MYSQL_HOST,
                "dst_port": MYSQL_PORT,
                "action": "deny",
                "reason": reason,
                "policy_mode": policy.get("mode"),
                "policy_id": policy.get("policy_id"),
                "layer": "proxy_l4_access_control",
                "containment": "preventive",
                "upstream_opened": False,
                "mysql_forwarding": False,
                "tcp_handshake_with_gateway": True,
                "pre_handshake_packet_drop": False,
            }
        )
        try:
            client.close()
        except OSError:
            pass
        return

    try:
        upstream = socket.create_connection((MYSQL_HOST, MYSQL_PORT), timeout=5.0)
    except OSError as exc:
        emit_event(
            {
                "event_id": f"{event_id}-upstream-fail",
                "event_type": "upstream_connect_failed",
                "correlated_attempt_id": event_id,
                "src_ip": src_ip,
                "error": str(exc),
                "layer": "proxy_l4_access_control",
                "policy_id": policy.get("policy_id"),
                "upstream_opened": False,
            }
        )
        client.close()
        return

    emit_event(
        {
            "event_id": f"{event_id}-allow",
            "event_type": "connection_allowed",
            "correlated_attempt_id": event_id,
            "src_ip": src_ip,
            "src_port": src_port,
            "dst_host": MYSQL_HOST,
            "dst_port": MYSQL_PORT,
            "action": "allow",
            "reason": reason,
            "policy_mode": policy.get("mode"),
            "policy_id": policy.get("policy_id"),
            "layer": "proxy_l4_access_control",
            "upstream_opened": True,
            "mysql_forwarding": True,
            "tcp_handshake_with_gateway": True,
            "pre_handshake_packet_drop": False,
        }
    )
    pipe(client, upstream)


def serve() -> None:
    EVENTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    emit_event(
        {
            "event_id": f"boot-{int(time.time())}",
            "event_type": "gateway_started",
            "listen": f"{LISTEN_HOST}:{LISTEN_PORT}",
            "upstream": f"{MYSQL_HOST}:{MYSQL_PORT}",
            "policy_path": str(POLICY_PATH),
            "stop_flag": str(STOP_FLAG),
        }
    )

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((LISTEN_HOST, LISTEN_PORT))
    server.listen(64)
    server.settimeout(1.0)

    while True:
        if STOP_FLAG.exists():
            emit_event(
                {
                    "event_id": f"stop-{int(time.time())}",
                    "event_type": "gateway_stop_flag",
                    "message": "STOP flag detected; exiting accept loop",
                    "stop_flag": str(STOP_FLAG),
                }
            )
            break
        try:
            client, addr = server.accept()
        except socket.timeout:
            continue
        except OSError:
            break
        thread = threading.Thread(target=handle_client, args=(client, addr), daemon=True)
        thread.start()

    server.close()


if __name__ == "__main__":
    serve()
