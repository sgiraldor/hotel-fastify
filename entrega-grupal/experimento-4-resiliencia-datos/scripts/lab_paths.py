"""Resolución de rutas del laboratorio Exp4 (portable Windows/Linux).

No asume profundidad fija desde el CWD. Usa git -C cuando hay repositorio.
"""
from __future__ import annotations

import subprocess
from pathlib import Path


LAB_PROJECT = "seguridad-caos-exp4"


def lab_root_from_script(script_file: str | Path) -> Path:
    """scripts/<file> -> raíz del laboratorio (padre de scripts/)."""
    return Path(script_file).resolve().parent.parent


def resolve_repo_root(start: Path) -> Path:
    """Devuelve toplevel git absoluto partiendo de start (lab o scripts).

    Raises RuntimeError si git falla o no hay repositorio.
    """
    start = Path(start).resolve()
    proc = subprocess.run(
        ["git", "-C", str(start), "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(f"GIT_REPO_ROOT_UNRESOLVED exit={proc.returncode} err={err}")
    toplevel = Path(proc.stdout.strip()).resolve()
    if not (toplevel / ".git").exists() and not (toplevel / ".git").is_file():
        # worktrees usan .git como archivo; is_file cuenta
        git_meta = toplevel / ".git"
        if not git_meta.exists():
            raise RuntimeError(f"GIT_REPO_ROOT_MISSING_DOTGIT path={toplevel}")
    return toplevel


def assert_lab_under_repo(lab: Path, repo: Path) -> None:
    lab_r = lab.resolve()
    repo_r = repo.resolve()
    try:
        lab_r.relative_to(repo_r)
    except ValueError as exc:
        raise RuntimeError(f"LAB_NOT_UNDER_REPO lab={lab_r} repo={repo_r}") from exc


def git_status_lines(repo: Path) -> tuple[int, list[str]]:
    proc = subprocess.run(
        ["git", "-C", str(repo), "status", "--short", "--branch"],
        capture_output=True,
        text=True,
        check=False,
    )
    lines = [ln for ln in (proc.stdout or "").splitlines() if ln.strip()]
    return proc.returncode, lines
