#!/usr/bin/env bash
# Parada y rollback SOLO del laboratorio seguridad-caos-exp4.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lab-common.sh
source "${SCRIPT_DIR}/lab-common.sh"

REASON="operator_stop"
CLEANUP_LAB=0
CONFIRM_DESTROY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --reason) REASON="$2"; shift 2 ;;
    --cleanup-lab-only) CLEANUP_LAB=1; shift ;;
    --confirm-destroy-lab-volumes) CONFIRM_DESTROY=1; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

assert_lab_compose_project
initialize_lab_runtime
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STOP="$(lab_events_dir)/STOP"
{
  echo "project=seguridad-caos-exp4"
  echo "reason=${REASON}"
  echo "utc=${STAMP}"
} >"${STOP}"
echo "STOP_WRITTEN=${STOP}"
echo "COMPOSE_STOP_SCOPE=project:seguridad-caos-exp4"

COMPOSE="$(lab_compose_file)"
if [[ "${EXP4_ALLOW_COMPOSE_STOP:-}" == "1" ]]; then
  docker compose -p seguridad-caos-exp4 -f "${COMPOSE}" stop
  if [[ "${CLEANUP_LAB}" -eq 1 && "${CONFIRM_DESTROY}" -eq 1 ]]; then
    echo "DESTRUCTIVE_CLEANUP=authorized for project seguridad-caos-exp4 only"
    docker compose -p seguridad-caos-exp4 -f "${COMPOSE}" down --volumes --remove-orphans
  fi
else
  echo "COMPOSE_STOP_SKIPPED set EXP4_ALLOW_COMPOSE_STOP=1 to actually stop containers"
fi
echo "STOP_DONE"
