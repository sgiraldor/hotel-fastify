#!/usr/bin/env bash
# Prepara runtime en host Linux/OCI sin chmod 777.
# Contenedores entrypoint hacen chown a UID/GID 10001 sobre bind mounts.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lab-common.sh
source "${SCRIPT_DIR}/lab-common.sh"

assert_lab_compose_project
initialize_lab_runtime

EVENTS="$(lab_events_dir)"
BACKUPS="$(lab_backups_dir)"
EVIDENCE="$(lab_evidence_dir)"

# Si el operador es root en la VM, alinear ownership al UID de appuser.
if [[ "$(id -u)" -eq 0 ]]; then
  chown -R 10001:10001 "${EVENTS}" "${BACKUPS}" "${EVIDENCE}" || true
  chmod 0750 "${EVENTS}" "${BACKUPS}" "${EVIDENCE}"
  find "${EVENTS}" "${BACKUPS}" "${EVIDENCE}" -type f -exec chmod 0640 {} \; || true
  echo "LINUX_PERMS_ROOT_APPLIED uid=10001 mode=0750/0640"
else
  echo "LINUX_PERMS_NONROOT: dirs 0750 created; entrypoints will chown when containers start as root then gosu 10001"
  echo "HINT: run once with sudo ./scripts/prepare-linux-perms.sh on OCI VM if bind mounts stay root-owned"
fi

# Manifest placeholder for SHA inventory (filled after backups)
MANIFEST="${EVIDENCE}/sha256-manifest.txt"
if [[ ! -f "${MANIFEST}" ]]; then
  printf '# sha256 manifest lab seguridad-caos-exp4 (append-only by operator tooling)\n' >"${MANIFEST}"
  chmod 0640 "${MANIFEST}" || true
fi
echo "PREPARE_LINUX_PERMS_OK"
