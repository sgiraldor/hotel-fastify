#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lab-common.sh
source "${SCRIPT_DIR}/lab-common.sh"
assert_lab_compose_project
OUT="${1:-}"
if [[ -z "${OUT}" ]]; then
  OUT="${LAB_ROOT}/evidencias/git-status-$(date -u +%Y%m%dT%H%M%SZ).txt"
fi
write_lab_git_evidence "${OUT}"
echo "GIT_STATUS_PASS out=${OUT}"
