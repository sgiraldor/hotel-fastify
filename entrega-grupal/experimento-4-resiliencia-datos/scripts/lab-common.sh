#!/usr/bin/env bash
# Funciones compartidas - seguridad-caos-exp4 (Linux / OCI VM).
# Modelo operativo B: runners Bash nativos en la VM (PowerShell Windows se conserva).
set -euo pipefail

LAB_PROJECT="seguridad-caos-exp4"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAB_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

lab_root() { echo "${LAB_ROOT}"; }
lab_compose_file() { echo "${LAB_ROOT}/docker-compose.yml"; }
lab_events_dir() { echo "${LAB_ROOT}/runtime/events"; }
lab_backups_dir() { echo "${LAB_ROOT}/runtime/backups"; }
lab_evidence_dir() { echo "${LAB_ROOT}/runtime/evidence"; }

repo_root() {
  # git -C desde el lab; no Push-Location / no cd relativo frágil
  local out code
  set +e
  out="$(git -C "${LAB_ROOT}" rev-parse --show-toplevel 2>&1)"
  code=$?
  set -e
  if [[ "${code}" -ne 0 || -z "${out}" ]]; then
    echo "GIT_REPO_ROOT_UNRESOLVED exit=${code} out=${out}" >&2
    return "${code:-1}"
  fi
  echo "${out}"
}

invoke_lab_git() {
  local repo
  repo="$(repo_root)"
  set +e
  git -C "${repo}" "$@"
  local code=$?
  set -e
  echo "GIT_C repo=${repo} exit=${code} args=$*" >&2
  return "${code}"
}

write_lab_git_evidence() {
  local outfile="$1"
  local repo
  repo="$(repo_root)"
  mkdir -p "$(dirname "${outfile}")"
  {
    echo "repo_root=${repo}"
    echo "lab_root=${LAB_ROOT}"
    for args in "rev-parse HEAD" "rev-parse main^{commit}" "rev-parse v1.2.0^{commit}" "status -sb" "status --short"; do
      # shellcheck disable=SC2086
      set +e
      out="$(git -C "${repo}" ${args} 2>&1)"
      code=$?
      set -e
      echo "cmd=git -C <repo> ${args}"
      echo "exit=${code}"
      echo "${out}"
      if [[ "${code}" -ne 0 ]]; then
        echo "GIT_EVIDENCE_FAIL cmd=${args} exit=${code}" >&2
        return "${code}"
      fi
    done
  } >"${outfile}"
  echo "GIT_EVIDENCE_OK file=${outfile}"
}

assert_lab_compose_project() {
  local compose
  compose="$(lab_compose_file)"
  grep -Eq '^name:[[:space:]]*seguridad-caos-exp4[[:space:]]*$' "${compose}"
  if grep -Eq '^[[:space:]]*ports[[:space:]]*:' "${compose}"; then
    echo "REFUSED: compose must not publish ports to host" >&2
    return 2
  fi
}

initialize_lab_runtime() {
  local events backups evidence
  events="$(lab_events_dir)"
  backups="$(lab_backups_dir)"
  evidence="$(lab_evidence_dir)"
  mkdir -p "${events}" "${backups}" "${evidence}"
  # Permisos de lab: 0750 (sin 777). Entrypoints hacen chown a UID 10001.
  chmod 0750 "${events}" "${backups}" "${evidence}" 2>/dev/null || true
  printf 'ok\n' >"${events}/.writable_by_lab"
  printf 'ok\n' >"${backups}/.writable_by_lab"
  printf 'ok\n' >"${evidence}/.writable_by_lab"
  chmod 0640 "${events}/.writable_by_lab" "${backups}/.writable_by_lab" "${evidence}/.writable_by_lab" 2>/dev/null || true
}

watchdog_healthy() {
  local hb
  hb="$(lab_events_dir)/watchdog_heartbeat.json"
  [[ -f "${hb}" ]] || return 1
  python3 -c "import json,sys; d=json.load(open(sys.argv[1],encoding='utf-8')); sys.exit(0 if d.get('healthy') else 1)" "${hb}"
}

assert_no_stop() {
  if [[ -f "$(lab_events_dir)/STOP" ]]; then
    echo "STOP present - refusing experimental action" >&2
    return 2
  fi
}

write_lab_deadline() {
  local run_id="$1" max_minutes="$2"
  local deadline
  deadline="$(python3 -c "from datetime import datetime,timedelta,timezone; print((datetime.now(timezone.utc)+timedelta(minutes=int('${max_minutes}'))).isoformat().replace('+00:00','Z'))")"
  python3 -c "import json,sys; json.dump({'project':'seguridad-caos-exp4','run_id':sys.argv[1],'active':True,'deadline_utc':sys.argv[2]}, open(sys.argv[3],'w',encoding='utf-8'), indent=2)" \
    "${run_id}" "${deadline}" "$(lab_events_dir)/experiment_deadline.json"
}

new_lab_run_id() {
  local scenario="$1"
  local stamp
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  echo "${scenario}-${stamp}"
}

add_lab_event() {
  local event_type="$1" run_id="$2" scenario="$3"
  shift 3
  local events_file
  events_file="$(lab_events_dir)/events.jsonl"
  EVENT_TYPE="${event_type}" RUN_ID="${run_id}" SCENARIO="${scenario}" EXTRA_KV="$*" EVENTS_FILE="${events_file}" python3 - <<'PY'
import json, os
from datetime import datetime, timezone
obj = {
    "timestamp_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
    "project": "seguridad-caos-exp4",
    "event_type": os.environ["EVENT_TYPE"],
    "run_id": os.environ["RUN_ID"],
    "scenario": os.environ["SCENARIO"],
}
for item in os.environ.get("EXTRA_KV", "").split():
    if "=" in item:
        k, v = item.split("=", 1)
        obj[k] = v
with open(os.environ["EVENTS_FILE"], "a", encoding="utf-8") as fh:
    fh.write(json.dumps(obj, ensure_ascii=False) + "\n")
PY
}

lab_write_plan_json() {
  python3 - <<'PY'
import json
print(json.dumps({"initial_commits":10,"mid_commits":3,"final_commits":3,"interval_ms":250,"total":16}))
PY
}
