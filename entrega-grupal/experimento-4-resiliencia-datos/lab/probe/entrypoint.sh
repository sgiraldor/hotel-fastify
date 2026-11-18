#!/bin/sh
set -e
# H10: preparar dirs de bind mount y bajar a UID 10001 (sin privileged / sin docker.sock)
for d in /events /evidence /backups; do
  if [ -d "$d" ]; then
    chown -R 10001:10001 "$d" 2>/dev/null || true
  fi
done
exec gosu 10001:10001 python -u probe.py "$@"
