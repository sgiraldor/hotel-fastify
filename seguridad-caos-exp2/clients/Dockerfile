FROM docker.io/library/python:3.12-slim

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends gosu; \
    rm -rf /var/lib/apt/lists/*; \
    groupadd -g 10001 labuser; \
    useradd -u 10001 -g 10001 -M -s /usr/sbin/nologin labuser

WORKDIR /app
COPY probe.py entrypoint.sh ./
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod 755 /app/entrypoint.sh

# Entrypoint root→chown evidence→gosu 10001; la sonda no corre como root.
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["python", "-u", "probe.py"]
