#!/bin/sh
set -e
if [ -d /events ]; then chown -R 10001:10001 /events 2>/dev/null || true; fi
exec gosu 10001:10001 python -u watchdog.py "$@"
