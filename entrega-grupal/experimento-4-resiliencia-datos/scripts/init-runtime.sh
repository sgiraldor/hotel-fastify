#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lab-common.sh
source "${SCRIPT_DIR}/lab-common.sh"
assert_lab_compose_project
initialize_lab_runtime
echo "LAB_RUNTIME_READY project=seguridad-caos-exp4 perms=0750 uid_note=entrypoint_chown_10001"
