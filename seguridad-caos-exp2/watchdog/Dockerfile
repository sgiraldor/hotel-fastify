FROM docker.io/library/python:3.12-slim

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends gosu; \
    rm -rf /var/lib/apt/lists/*; \
    groupadd -g 10001 labuser; \
    useradd -u 10001 -g 10001 -M -s /usr/sbin/nologin labuser

WORKDIR /app
COPY watchdog.py entrypoint.sh ./
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod 755 /app/entrypoint.sh

HEALTHCHECK --interval=2s --timeout=2s --retries=5 --start-period=3s \
  CMD python -c "from pathlib import Path; import time,sys; p=Path('/events/watchdog_heartbeat.json'); sys.exit(0 if p.exists() and time.time()-p.stat().st_mtime < 10 else 1)"

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["python", "-u", "watchdog.py"]
