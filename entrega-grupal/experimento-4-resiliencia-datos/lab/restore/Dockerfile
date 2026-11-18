FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends default-mysql-client gosu \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -u 10001 -m appuser
WORKDIR /app
COPY shared/lab_identity.py shared/common_events.py ./
COPY restore/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY restore/restore.py restore/fault.py restore/entrypoint.sh ./
RUN chmod +x entrypoint.sh && sed -i 's/\r$//' entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
