#!/bin/sh
set -e
for d in /events /evidence /backups; do
  if [ -d "$d" ]; then chown -R 10001:10001 "$d" 2>/dev/null || true; fi
done
# Default: restore.py; fault via --entrypoint override or RESTORE_ENTRYPOINT
TARGET="${RESTORE_ENTRYPOINT:-restore.py}"
exec gosu 10001:10001 python -u "$TARGET" "$@"
