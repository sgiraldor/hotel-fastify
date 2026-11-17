# Observabilidad compartida — Seguimiento #4 (Samuel)

Plataforma académica en **OKE existente** (mismo worker ARM64).  
Sin NLB adicional. Grafana por port-forward.

```text
Sports (AWS) ──┐
Cine   (GCP) ──┼──► HTTPS :31443 (TLS + Basic) ──► nginx proxy ──► Collector :4318
Hotel  (OCI) ──┘ (cluster interno HTTP+Basic) ──► Collector ──► Tempo
                                                      │
                                                      └── Prometheus exporter :8889 ──► Prometheus
Hotel /metrics/prometheus ─────────────────────────── scrape ──► Prometheus ──► Grafana
```

## Estado real (validado)

| Señal | Estado |
|-------|--------|
| Collector + Tempo + Prometheus + Grafana + TLS proxy | **Ready** |
| Ingesta pública | **solo HTTPS** NodePort `31443` (HTTP `31418` cerrado) |
| Auth externa | TLS + HTTP Basic → 401 sin credenciales / 200 con Basic |
| Hotel → Tempo / Prometheus | **OK** (`service.name=hotel-api`) |
| Sports / Cine → collector | **OK** (métricas/trazas sueltas) |
| W3C E2E un solo Trace ID (3 SERVER) | **SÍ** — `4d2c23eb...` y `4f8140a1...` (`93-*`; histórico incompleto `92-*`) |
| Let's Encrypt / CA pública | **bloqueado**: hace falta dominio DNS apuntando a la IP (no inventado) |

Evidencias: `80-*` HTTP; `81-*` HTTPS; `91-*` Cine; `92-*` W3C E2E.

---

## Contrato común (Daniel / Jarrison)

> Token lab por **canal privado**. No va en Git ni en este archivo.  
> Certificado público lab: `observability/certs/otel-lab-ca.crt` (sí versionado).

### Endpoint OTLP definitivo

| Campo | Valor |
|-------|--------|
| URL base | `https://157.137.233.183:31443` |
| Protocolo OTLP | `http/protobuf` (`OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`) |
| Transporte | **HTTPS** (TLS 1.2+) |
| Puerto | `31443` (NodePort → proxy nginx → collector 4318) |
| Traces | `POST /v1/traces` |
| Metrics | `POST /v1/metrics` |
| Auth | HTTP Basic usuario `otel-lab` + token lab **sobre TLS** |
| Header | `Authorization: Basic base64(otel-lab:<TOKEN>)` |
| Trust | confiar `observability/certs/otel-lab-ca.crt` (autofirmado, IP SAN) |

Verificación externa:

```bash
# Sin auth → 401
curl -sS --cacert observability/certs/otel-lab-ca.crt -o /dev/null -w "%{http_code}\n" \
  -X POST https://157.137.233.183:31443/v1/traces \
  -H 'content-type: application/json' -d '{}'

# Con Basic → 200
curl -sS --cacert observability/certs/otel-lab-ca.crt -u "otel-lab:$OTEL_LAB_TOKEN" \
  -X POST https://157.137.233.183:31443/v1/traces \
  -H 'content-type: application/json' -d '{}'
```

### Variables exactas (Sports / Cine)

```env
OTEL_SERVICE_NAME=sports-api
# o: OTEL_SERVICE_NAME=cine-api
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_ENDPOINT=https://157.137.233.183:31443
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <BASE64(otel-lab:TOKEN)>
OTEL_EXPORTER_OTLP_CERTIFICATE=/ruta/a/otel-lab-ca.crt
# Alternativa Node: NODE_EXTRA_CA_CERTS=/ruta/a/otel-lab-ca.crt
```

| service.name | Owner |
|--------------|-------|
| `hotel-api` | Samuel — ya exporta (cluster-interno) |
| `sports-api` | Jarrison |
| `cine-api` | Daniel |

### Propagación

1. Sports genera `x-trace-id` (UUID negocio).
2. Reenviar `x-trace-id` + W3C `traceparent` / `tracestate`.
3. No confundir Trace ID OTel con `x-trace-id`.

### Hotel (solo cluster)

```env
OTEL_SERVICE_NAME=hotel-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector.observability.svc.cluster.local:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <BASE64>   # Secret K8s
```

### Grafana

```powershell
kubectl -n observability port-forward svc/grafana 3001:3000
# http://127.0.0.1:3001/d/seguimiento-4-multicloud
# http://127.0.0.1:3001/d/experimento-a-503
```

El dashboard del 503 está en el ConfigMap `grafana-dashboards`, archivo `experimento-a.json`, junto a `multicloud.json`. Grafana lo lee cada 30 s desde `/var/lib/grafana/dashboards`. No hizo falta reiniciar el pod. La ventana por defecto es 17/11/2026 00:40:00 a 01:20:00, hora de Colombia.

Para quitar solo ese dashboard, sin tocar el multicloud:

```powershell
kubectl apply -f k8s/observability/grafana-dashboards-backup.yaml
```

Ese respaldo es el ConfigMap anterior, únicamente con `multicloud.json`. El proveedor tiene `disableDeletion: false`, así que al desaparecer el archivo Grafana retira `experimento-a-503`. No se borran pods ni se cambia el Deployment.

---

## Bloqueo CA pública

Para sustituir el cert lab por Let's Encrypt hace falta un **dominio** (p. ej. `otel.ejemplo.edu`) con DNS A → `157.137.233.183` y apertura del challenge.  
**No se ha inventado dominio ni se ha creado LB/cert de pago.**

## Recursos / costos

| Recurso | Estado |
|---------|--------|
| nginx TLS proxy + Secret `otel-tls-lab` | creado (mismo worker) |
| NodePort HTTPS 31443 | sin NLB nuevo |
| NodePort HTTP 31418 | **eliminado** |
| Segundo NLB / dominio / cert comercial | **no** |
