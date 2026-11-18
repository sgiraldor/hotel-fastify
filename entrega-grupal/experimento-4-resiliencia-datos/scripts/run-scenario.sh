#!/usr/bin/env bash
# Runner R0/R1 Linux (modelo B). Paridad con run-scenario.ps1.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lab-common.sh
source "${SCRIPT_DIR}/lab-common.sh"

SCENARIO=""
AUTHORIZED=0
MAX_MINUTES=30

usage() {
  echo "Usage: $0 --scenario r0|r1 --authorized [--max-minutes N]" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scenario) SCENARIO="$2"; shift 2 ;;
    --authorized) AUTHORIZED=1; shift ;;
    --max-minutes) MAX_MINUTES="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ "${SCENARIO}" != "r0" && "${SCENARIO}" != "r1" ]]; then
  usage; exit 2
fi
if [[ "${AUTHORIZED}" -ne 1 ]]; then
  echo "REFUSED: pass --authorized only when an operator explicitly starts an experiment window"
  exit 2
fi
if [[ "${EXP4_ALLOW_COMPOSE:-}" != "1" ]]; then
  echo "REFUSED: set EXP4_ALLOW_COMPOSE=1 to allow docker compose actions for this lab only"
  exit 2
fi

assert_lab_compose_project
initialize_lab_runtime
assert_no_stop

RUN_ID="$(new_lab_run_id "${SCENARIO}")"
write_lab_deadline "${RUN_ID}" "${MAX_MINUTES}"

INITIAL=10; MID=3; FINAL=3; INTERVAL_MS=250
INTERVAL_OBJ=300
if [[ "${SCENARIO}" == "r1" ]]; then INTERVAL_OBJ=30; fi
if [[ "${SCENARIO}" == "r0" && -n "${BACKUP_INTERVAL_R0_SEC:-}" ]]; then INTERVAL_OBJ="${BACKUP_INTERVAL_R0_SEC}"; fi
if [[ "${SCENARIO}" == "r1" && -n "${BACKUP_INTERVAL_R1_SEC:-}" ]]; then INTERVAL_OBJ="${BACKUP_INTERVAL_R1_SEC}"; fi

COMPOSE="$(lab_compose_file)"
echo "RUN_ID=${RUN_ID} SCENARIO=${SCENARIO}"
echo "WRITE_PLAN total=16 initial=${INITIAL} mid=${MID} final=${FINAL} intervalMs=${INTERVAL_MS}"
echo "G1=extra_mid_backup_only_on_r1 G2=automated_restore_on_r1"

docker compose -p seguridad-caos-exp4 -f "${COMPOSE}" up -d mysql monitor watchdog

deadline_hb=$((SECONDS + 90))
while (( SECONDS < deadline_hb )); do
  if watchdog_healthy; then break; fi
  sleep 1
done
if ! watchdog_healthy; then
  echo "watchdog not healthy" >&2
  exit 1
fi

invoke_gen() {
  local count="$1" seq_start="$2"
  assert_no_stop
  watchdog_healthy || { echo "watchdog unhealthy - cancelling" >&2; exit 1; }
  docker compose -p seguridad-caos-exp4 -f "${COMPOSE}" --profile tools run --rm generator \
    --run-id "${RUN_ID}" --scenario "${SCENARIO}" --count "${count}" --interval-ms "${INTERVAL_MS}" --seq-start "${seq_start}"
}

invoke_backup_once() {
  assert_no_stop
  watchdog_healthy || { echo "watchdog unhealthy - cancelling" >&2; exit 1; }
  docker compose -p seguridad-caos-exp4 -f "${COMPOSE}" --profile tools run --rm backup \
    --run-id "${RUN_ID}" --scenario "${SCENARIO}" --once
}

invoke_gen "${INITIAL}" 1
invoke_backup_once
BACKUP_AFTER_INITIAL="$(ls -1t "$(lab_backups_dir)"/backup-*.meta.json 2>/dev/null | head -n1 || true)"

invoke_gen "${MID}" "$((INITIAL + 1))"

if [[ "${SCENARIO}" == "r1" ]]; then
  invoke_backup_once
fi

invoke_gen "${FINAL}" "$((INITIAL + MID + 1))"

if [[ "${SCENARIO}" == "r0" ]]; then
  RESTORE_META="${BACKUP_AFTER_INITIAL}"
else
  RESTORE_META="$(ls -1t "$(lab_backups_dir)"/backup-*.meta.json 2>/dev/null | head -n1 || true)"
fi
if [[ -z "${RESTORE_META}" || ! -f "${RESTORE_META}" ]]; then
  echo "no backup meta found" >&2
  exit 1
fi
BACKUP_ID="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1],encoding='utf-8'))['backup_id'])" "${RESTORE_META}")"
echo "RESTORE_BACKUP_ID=${BACKUP_ID}"

docker compose -p seguridad-caos-exp4 -f "${COMPOSE}" --profile tools run --rm -e RESTORE_ENTRYPOINT=fault.py restore \
  --run-id "${RUN_ID}" --scenario "${SCENARIO}" --wipe-commits --authorized

MIN_COMMITS="${INITIAL}"
if [[ "${SCENARIO}" == "r1" ]]; then MIN_COMMITS="$((INITIAL + MID))"; fi

if [[ "${SCENARIO}" == "r0" ]]; then
  REQ="$(lab_events_dir)/R0_MANUAL_RESTORE_REQUIRED.json"
  DONE="$(lab_events_dir)/R0_MANUAL_RESTORE_DONE.json"
  rm -f "${DONE}"
  python3 -c "import json,sys; json.dump({'project':'seguridad-caos-exp4','run_id':sys.argv[1],'backup_id':sys.argv[2],'scenario':'r0','instruction':f'./scripts/restore-manual-r0.sh --run-id {sys.argv[1]} --backup-id {sys.argv[2]} --authorized'}, open(sys.argv[3],'w',encoding='utf-8'), indent=2)" \
    "${RUN_ID}" "${BACKUP_ID}" "${REQ}"
  add_lab_event manual_restore_waiting "${RUN_ID}" r0 "backup_id=${BACKUP_ID}"
  echo "R0_WAITING_FOR_MANUAL_RESTORE backup_id=${BACKUP_ID}"
  echo "OPERATOR_ACTION: ./scripts/restore-manual-r0.sh --run-id ${RUN_ID} --backup-id ${BACKUP_ID} --authorized"

  WAIT_DEADLINE=$((SECONDS + MAX_MINUTES * 60))
  while true; do
    if [[ -f "$(lab_events_dir)/STOP" ]]; then
      echo "STOP during manual wait - aborting safely" >&2
      exit 1
    fi
    if ! watchdog_healthy; then
      echo "watchdog unhealthy during manual wait - aborting" >&2
      exit 1
    fi
    if (( SECONDS > WAIT_DEADLINE )); then
      add_lab_event manual_restore_timeout "${RUN_ID}" r0 "backup_id=${BACKUP_ID}"
      echo "manual restore not completed before MaxMinutes - safe abort" >&2
      exit 1
    fi
    if [[ -f "${DONE}" ]]; then break; fi
    EV="$(lab_events_dir)/events.jsonl"
    if [[ -f "${EV}" ]] && grep -q "restore_completed" "${EV}" && grep -q "${RUN_ID}" "${EV}"; then
      if python3 -c "import json,sys; rid=sys.argv[1];
import pathlib
p=pathlib.Path(sys.argv[2])
ok=False
for line in p.read_text(encoding='utf-8').splitlines():
  if not line.strip(): continue
  e=json.loads(line)
  if e.get('event_type')=='restore_completed' and e.get('run_id')==rid: ok=True
sys.exit(0 if ok else 1)" "${RUN_ID}" "${EV}"; then
        break
      fi
    fi
    sleep 2
  done
  echo "R0_MANUAL_RESTORE_DETECTED"
else
  assert_no_stop
  docker compose -p seguridad-caos-exp4 -f "${COMPOSE}" --profile tools run --rm restore \
    --run-id "${RUN_ID}" --scenario "${SCENARIO}" --backup-id "${BACKUP_ID}" --mode auto --authorized
fi

PROBE_OK=0
for _ in $(seq 1 30); do
  assert_no_stop
  if docker compose -p seguridad-caos-exp4 -f "${COMPOSE}" --profile tools run --rm probe \
    --run-id "${RUN_ID}" --scenario "${SCENARIO}" --interval-sec 1 --min-commits "${MIN_COMMITS}" --once; then
    PROBE_OK=1
    break
  fi
  sleep 1
done
if [[ "${PROBE_OK}" -ne 1 ]]; then
  echo "service probe did not become OK" >&2
  exit 1
fi

OUT_DIR="${LAB_ROOT}/evidencias-publicas/${SCENARIO}/${RUN_ID}"
mkdir -p "${OUT_DIR}"
EVENTS="$(lab_events_dir)/events.jsonl"
ALERTS="$(lab_events_dir)/alerts.jsonl"
python3 "${SCRIPT_DIR}/compute-metrics.py" \
  --events "${EVENTS}" --alerts "${ALERTS}" \
  --run-id "${RUN_ID}" --scenario "${SCENARIO}" \
  --out "${OUT_DIR}/metrics.json" \
  --backup-interval-sec "${INTERVAL_OBJ}" --probe-interval-sec 1

cp -f "${EVENTS}" "${OUT_DIR}/events.jsonl" 2>/dev/null || true
cp -f "${ALERTS}" "${OUT_DIR}/alerts.jsonl" 2>/dev/null || true
cp -f "${RESTORE_META}" "${OUT_DIR}/backup.meta.json" 2>/dev/null || true

export EXP4_ALLOW_COMPOSE_STOP=1
"${SCRIPT_DIR}/stop-experiment.sh" --reason "end_of_${SCENARIO}"
echo "SCENARIO_DONE run_id=${RUN_ID} out=${OUT_DIR}"
