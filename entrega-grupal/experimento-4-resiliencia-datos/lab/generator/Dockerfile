# Multi-arch tipico (amd64/arm64). Rebuild en la arquitectura de la VM OCI.
# Compatibilidad ARM64 runtime: NO verificada hasta smoke OCI.
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -u 10001 -m appuser
WORKDIR /app
COPY shared/lab_identity.py shared/common_events.py ./
COPY generator/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY generator/generator.py generator/entrypoint.sh ./
RUN chmod +x entrypoint.sh && sed -i 's/\r$//' entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
