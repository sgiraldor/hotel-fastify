#!/bin/sh
set -eu
EVENTS_DIR="${EVENTS_DIR:-/events}"
mkdir -p "$EVENTS_DIR"
chown -R 10001:10001 "$EVENTS_DIR" 2>/dev/null || true
exec gosu 10001:10001 "$@"
