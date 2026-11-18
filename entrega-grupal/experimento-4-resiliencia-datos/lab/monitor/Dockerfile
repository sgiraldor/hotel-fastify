FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -u 10001 -m appuser
WORKDIR /app
COPY monitor/monitor.py monitor/entrypoint.sh ./
RUN chmod +x entrypoint.sh && sed -i 's/\r$//' entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
