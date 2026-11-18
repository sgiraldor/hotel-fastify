"""Identidad inmutable del laboratorio seguridad-caos-exp4 (H3).

Las constantes NO pueden alterarse por variables de entorno.
"""
from __future__ import annotations

ALLOWED_PROJECT = "seguridad-caos-exp4"
ALLOWED_DB = "lab_resilience_db"
ALLOWED_HOSTS = frozenset({"172.31.10.10", "mysql", "seguridad-caos-exp4-mysql"})
LAB_META_PROJECT_KEY = "project"
LAB_META_DB_KEY = "db_name"

# Plan de escrituras equivalente R0/R1 (H2)
WRITE_PLAN = {
    "initial_commits": 10,
    "mid_commits": 3,
    "final_commits": 3,
    "interval_ms": 250,
    # total = 16; R1 inserta un backup extra entre mid y final (G1), sin cambiar writes
}


def total_commits() -> int:
    return int(WRITE_PLAN["initial_commits"] + WRITE_PLAN["mid_commits"] + WRITE_PLAN["final_commits"])
