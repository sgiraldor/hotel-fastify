FROM docker.io/library/python:3.12-slim

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends gosu; \
    rm -rf /var/lib/apt/lists/*; \
    groupadd -g 10001 labuser; \
    useradd -u 10001 -g 10001 -M -s /usr/sbin/nologin labuser

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY detector.py entrypoint.sh ./
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod 755 /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["python", "-u", "detector.py"]
