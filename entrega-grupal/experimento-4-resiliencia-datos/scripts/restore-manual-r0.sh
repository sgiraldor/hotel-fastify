#!/usr/bin/env bash
# Restauración manual R0 (H1) — Linux/OCI. Registra t_restore_inicio real del operador.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lab-common.sh
source "${SCRIPT_DIR}/lab-common.sh"

RUN_ID=""
BACKUP_ID=""
AUTHORIZED=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id) RUN_ID="$2"; shift 2 ;;
    --backup-id) BACKUP_ID="$2"; shift 2 ;;
    --authorized) AUTHORIZED=1; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

echo "CHECKLIST_R0_MANUAL_RESTORE"
echo "1. Confirm project=seguridad-caos-exp4"
echo "2. Confirm database=lab_resilience_db"
echo "3. Confirm host allowlist 172.31.10.10"
echo "4. Confirm backup sha256 meta matches dump"
echo "5. Confirm STOP absent / watchdog healthy"
echo "6. Only then pass --authorized"

if [[ -z "${RUN_ID}" || -z "${BACKUP_ID}" ]]; then
  echo "REFUSED: --run-id and --backup-id required" >&2
  exit 2
fi
if [[ "${AUTHORIZED}" -ne 1 ]]; then
  echo "REFUSED: manual restore not authorized yet"
  exit 2
fi
if [[ "${EXP4_ALLOW_COMPOSE:-}" != "1" ]]; then
  echo "REFUSED: EXP4_ALLOW_COMPOSE!=1"
  exit 2
fi

assert_lab_compose_project
assert_no_stop
if ! watchdog_healthy; then
  echo "watchdog unhealthy - refusing manual restore" >&2
  exit 1
fi

TS="$(python3 -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]+'Z')")"
add_lab_event operator_restore_authorized "${RUN_ID}" r0 "backup_id=${BACKUP_ID}" "t_restore_inicio=${TS}" "mode=manual"

COMPOSE="$(lab_compose_file)"
docker compose -p seguridad-caos-exp4 -f "${COMPOSE}" --profile tools run --rm restore \
  --run-id "${RUN_ID}" --scenario r0 --backup-id "${BACKUP_ID}" --mode manual --authorized

DONE="$(lab_events_dir)/R0_MANUAL_RESTORE_DONE.json"
python3 -c "import json,sys; from datetime import datetime,timezone; json.dump({'run_id':sys.argv[1],'backup_id':sys.argv[2],'utc':datetime.now(timezone.utc).isoformat()}, open(sys.argv[3],'w',encoding='utf-8'), indent=2)" \
  "${RUN_ID}" "${BACKUP_ID}" "${DONE}"
echo "R0_MANUAL_RESTORE_DONE=${DONE}"
