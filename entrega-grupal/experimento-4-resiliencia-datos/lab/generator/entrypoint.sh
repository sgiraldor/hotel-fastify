#!/bin/sh
set -e
for d in /events /evidence; do
  if [ -d "$d" ]; then chown -R 10001:10001 "$d" 2>/dev/null || true; fi
done
exec gosu 10001:10001 python -u generator.py "$@"
