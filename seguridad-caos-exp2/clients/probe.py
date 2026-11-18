#!/usr/bin/env python3
"""Sonda TCP/MySQL del laboratorio.

Distingue (H1):
  - tcp_connected: handshake TCP con el gateway (puede ser true aunque haya deny).
  - mysql_greeting_received: byte 0x0a (protocol version) típico del greeting MySQL.
  - access_blocked: true cuando TCP ok pero no hay greeting / canal cerrado sin MySQL.

Respeta STOP y ABORT_PROBES: no inicia tráfico experimental si están activos.
"""

from __future__ import annotations

import json
import os
import socket
import sys
from datetime import datetime, timezone
from pathlib import Path


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def load_run_context(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        raw = path.read_text(encoding="utf-8-sig")
        return json.loads(raw)
    except (OSError, json.JSONDecodeError):
        return {}


def looks_like_mysql_greeting(data: bytes) -> bool:
    if len(data) < 5:
        return False
    return data[4] == 0x0A


def ensure_evidence_dir(path: Path) -> Path:
    """Garantiza directorio escribible sin chmod 777. Fallo explícito si no hay permiso."""
    try:
        path.mkdir(parents=True, exist_ok=True)
        probe = path / ".probe_write_check"
        probe.write_text("ok\n", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return path
    except OSError as exc:
        raise SystemExit(f"EVIDENCE_DIR_NOT_WRITABLE path={path} error={exc}") from exc


def main() -> int:
    role = os.environ.get("CLIENT_ROLE", "unknown")
    host = os.environ.get("TARGET_HOST", "172.30.30.20")
    port = int(os.environ.get("TARGET_PORT", "3306"))
    timeout = float(os.environ.get("CONNECT_TIMEOUT", "3.0"))
    evidence_dir = ensure_evidence_dir(Path(os.environ.get("EVIDENCE_DIR", "/evidence")))
    stop_flag = Path(os.environ.get("STOP_FLAG", "/events/STOP"))
    abort_flag = Path(os.environ.get("ABORT_FLAG", "/events/ABORT_PROBES"))
    run_ctx_path = Path(os.environ.get("RUN_CONTEXT_PATH", "/events/run_context.json"))

    ctx = load_run_context(run_ctx_path)
    t0 = utc_now()

    result: dict = {
        "client_role": role,
        "target_host": host,
        "target_port": port,
        "t0_attempt_utc": t0,
        "run_id": ctx.get("run_id"),
        "scenario": ctx.get("scenario"),
        "policy_id": ctx.get("policy_id"),
        "layer_tested": "tcp_plus_mysql_greeting",
        "auth_tested": False,
        "data_access_tested": False,
        "tcp_connected": False,
        "mysql_greeting_received": False,
        "access_blocked": False,
        "pre_handshake_packet_drop_claimed": False,
        "traffic_attempted": False,
        "note": (
            "tcp_connected refleja handshake con el gateway/proxy; "
            "mysql_greeting_received indica reenvío efectivo hacia MySQL; "
            "access_blocked=true si TCP ok sin greeting (deny de proxy post-accept)."
        ),
    }

    if stop_flag.exists() or abort_flag.exists():
        result["probe_outcome"] = "aborted_stop_or_abort_flag"
        result["stop_flag_present"] = stop_flag.exists()
        result["abort_flag_present"] = abort_flag.exists()
        result["completed_utc"] = utc_now()
        out = evidence_dir / f"probe-{role}-aborted-{t0.replace(':', '').replace('.', '-')}.json"
        out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(json.dumps(result, ensure_ascii=False))
        return 2

    result["traffic_attempted"] = True
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        sock.connect((host, port))
        result["tcp_connected"] = True
        # Re-check STOP mid-flight before reading (intentos experimentales deben cesar)
        if stop_flag.exists() or abort_flag.exists():
            result["probe_outcome"] = "aborted_after_connect"
            result["stop_flag_present"] = stop_flag.exists()
            result["abort_flag_present"] = abort_flag.exists()
            result["access_blocked"] = True
            rc = 2
        else:
            sock.settimeout(2.0)
            try:
                data = sock.recv(64)
                result["bytes_received"] = len(data)
                if data and looks_like_mysql_greeting(data):
                    result["mysql_greeting_received"] = True
                    result["probe_outcome"] = "mysql_path_open"
                    result["access_blocked"] = False
                    rc = 0
                elif data:
                    result["probe_outcome"] = "unexpected_banner"
                    result["access_blocked"] = True
                    rc = 1
                else:
                    result["probe_outcome"] = "tcp_ok_no_mysql_greeting"
                    result["access_blocked"] = True
                    rc = 1
            except OSError as exc:
                result["recv_error"] = str(exc)
                result["probe_outcome"] = "tcp_ok_recv_failed"
                result["access_blocked"] = True
                rc = 1
    except OSError as exc:
        result["tcp_connected"] = False
        result["access_blocked"] = True
        result["probe_outcome"] = "tcp_failure"
        result["error"] = str(exc)
        rc = 1
    finally:
        try:
            sock.close()
        except OSError:
            pass

    result["completed_utc"] = utc_now()
    out = evidence_dir / (
        f"probe-{role}-{ctx.get('scenario', 'na')}-"
        f"{t0.replace(':', '').replace('.', '-')}.json"
    )
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))
    return rc


if __name__ == "__main__":
    sys.exit(main())
