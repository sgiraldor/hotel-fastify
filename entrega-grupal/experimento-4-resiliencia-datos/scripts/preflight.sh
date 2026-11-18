#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lab-common.sh
source "${SCRIPT_DIR}/lab-common.sh"

CHECK_DOCKER=0
[[ "${1:-}" == "--check-docker-config" ]] && CHECK_DOCKER=1

assert_lab_compose_project
initialize_lab_runtime
echo "PROJECT=seguridad-caos-exp4"
echo "ROOT=$(lab_root)"
echo "COMPOSE=$(lab_compose_file)"
echo "REPO_ROOT=$(repo_root)"

compose="$(lab_compose_file)"
if grep -Eiq 'hotel-mysql|hotel-oke|/var/run/docker\.sock' "${compose}"; then
  echo "REFUSED: compose references protected DevOps resources or Docker socket mount" >&2
  exit 2
fi
echo "COMPOSE_SAFE=True"

if [[ "${CHECK_DOCKER}" -eq 1 ]]; then
  docker compose -p seguridad-caos-exp4 -f "${compose}" config >/dev/null
  echo "COMPOSE_CONFIG_OK=True"
fi
echo "PREFLIGHT_OK"
