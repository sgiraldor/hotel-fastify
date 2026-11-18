#!/bin/sh
# Drop a labuser tras asegurar que /evidence es escribible (sin chmod 777).
set -eu
EVIDENCE_DIR="${EVIDENCE_DIR:-/evidence}"
EVENTS_DIR="${EVENTS_RO_DIR:-/events}"
mkdir -p "$EVIDENCE_DIR"
chown -R 10001:10001 "$EVIDENCE_DIR" 2>/dev/null || true
# Verificar escritura real como labuser antes de la sonda.
if ! gosu 10001:10001 sh -c "touch '$EVIDENCE_DIR/.write_test' && rm -f '$EVIDENCE_DIR/.write_test'"; then
  echo "EVIDENCE_NOT_WRITABLE path=$EVIDENCE_DIR" >&2
  exit 10
fi
exec gosu 10001:10001 "$@"
