#!/bin/sh
# Arranca como root solo para alinear ownership de /events; luego drop a labuser (10001).
set -eu
EVENTS_DIR="${EVENTS_DIR:-/events}"
mkdir -p "$EVENTS_DIR"
# Bind mounts en Docker Desktop/Windows pueden ignorar chown; no fallar por ello.
chown -R 10001:10001 "$EVENTS_DIR" 2>/dev/null || true
# Sin chmod 777. El proceso de aplicación no permanece como root.
exec gosu 10001:10001 "$@"
