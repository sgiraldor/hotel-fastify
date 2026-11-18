"""
Provider Python para Chaos Toolkit.

Orquesta chaos/replicas-toolkit.ps1 sin reimplementar la inyección.
Si el script sale con código distinto de 0, lanza ActivityFailed para que
el method del experimento falle de verdad (el provider process solo avisa).
"""

from __future__ import annotations

import os
import subprocess
from chaoslib.exceptions import ActivityFailed

__all__ = ["status", "enable", "verify_active", "disable"]


def _toolkit_script() -> str:
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "replicas-toolkit.ps1")


def _run(action: str, timeout: int = 120) -> bool:
    script = _toolkit_script()
    if not os.path.isfile(script):
        raise ActivityFailed(f"No está replicas-toolkit.ps1: {script}")

    proc = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-File",
            script,
            "-Action",
            action,
        ],
        capture_output=True,
        timeout=timeout,
        text=True,
        env=os.environ.copy(),
        check=False,
    )
    stdout = proc.stdout or ""
    stderr = proc.stderr or ""
    if proc.returncode != 0:
        raise ActivityFailed(
            f"replicas-toolkit -Action {action} exit={proc.returncode}\n"
            f"stdout:\n{stdout}\n"
            f"stderr:\n{stderr}"
        )
    # True encaja con tolerance: true del steady-state.
    return True


def status(timeout: int = 90) -> bool:
    return _run("status", timeout=timeout)


def enable(timeout: int = 120) -> bool:
    return _run("enable", timeout=timeout)


def verify_active(timeout: int = 90) -> bool:
    return _run("verify-active", timeout=timeout)


def disable(timeout: int = 90) -> bool:
    return _run("disable", timeout=timeout)
