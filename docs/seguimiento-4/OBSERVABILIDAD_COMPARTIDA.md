# Observabilidad compartida — Seguimiento #4 (Samuel)

Plataforma académica en **OKE existente** (mismo worker ARM64 2 OCPU / 12 GB).  
Sin NLB adicional. Sin aumentar nodos. Grafana por port-forward.

```text
Sports (AWS) ──┐
Hotel  (OCI) ──┼──► OTLP HTTP :4318 (Basic Auth) ──► Collector ──► Tempo (trazas)
Cine   (GCP) ──┘                                      │
                                                      └──► Prometheus exporter :8889 ──► Prometheus
Hotel /metrics/prometheus ─────────────────────────── scrape ──► Prometheus ──► Grafana
```

## Estado real (validado)

| Señal | Estado |
|-------|--------|
| Collector + Tempo + Prometheus + Grafana en `observability` | **Ready** |
| Hotel → OTLP → Tempo | **Trazas `service.name=hotel-api` visibles** |
| Hotel scrape Prometheus | **targets up** (`hotel_http_p95_ms`, etc.) |
| OTLP metrics pipeline (collector → Prometheus) | **activo** |
| Sports / Cine | **pendiente** (aún no envían) |

Evidencias: `evidencias/seguimiento-4-local/80-*`.

---

## Contrato común (compartir con Daniel y Jarrison)

> El **token** se entrega por canal privado. **No** va en Git ni en este archivo.

### Endpoint OTLP (ingesta pública lab)

| Campo | Valor |
|-------|--------|
| URL base | `http://157.137.233.183:31418` |
| Protocolo | `http/protobuf` (`OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`) |
| Puerto | `31418` (NodePort → 4318 del collector) |
| Traces | `POST /v1/traces` |
| Metrics | `POST /v1/metrics` |
| Auth | **HTTP Basic** usuario `otel-lab` + password = token de laboratorio |
| Header | `Authorization: Basic base64(otel-lab:<TOKEN>)` |
| HTTPS | no (evitar LB/cert de pago); protección = Basic + body ≤4 MiB + memory_limiter |
| Límite | `max_request_body_size=4MiB`; collector `memory_limiter` ~180 MiB |

Verificación rápida:

```bash
# Sin auth → 401
curl -sS -o /dev/null -w "%{http_code}\n" -X POST \
  http://157.137.233.183:31418/v1/traces -H 'content-type: application/json' -d '{}'

# Con auth → 200 (partialSuccess vacío OK)
curl -sS -u "otel-lab:$OTEL_LAB_TOKEN" -X POST \
  http://157.137.233.183:31418/v1/traces -H 'content-type: application/json' -d '{}'
```

### Variables de entorno (Sports / Cine / Hotel)

```env
OTEL_SERVICE_NAME=sports-api          # o cine-api / hotel-api
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_ENDPOINT=http://157.137.233.183:31418
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <BASE64(otel-lab:TOKEN)>
```

Nombres de servicio **obligatorios**:

| service.name | Owner |
|--------------|-------|
| `hotel-api` | Samuel (OCI) — **ya exporta** |
| `sports-api` | Jarrison (AWS) |
| `cine-api` | Daniel (GCP) |

### Propagación de traza

1. Sports genera `x-trace-id` (UUID de negocio) al inicio E2E.
2. Reenviar `x-trace-id` + W3C `traceparent` / `tracestate` a Hotel y Cine.
3. OTel propaga el contexto de traza; **no** confundir Trace ID OTel con `x-trace-id`.
4. Reflejar `x-trace-id` en la respuesta al cliente.

### Grafana (acceso restringido / sustentación)

```powershell
kubectl -n observability port-forward svc/grafana 3001:3000
# http://127.0.0.1:3001
# Dashboard: "Seguimiento #4 — Multicloud Observability"
# Usuario admin; password en Secret grafana-admin (no en Git)
```

Prometheus/Tempo también ClusterIP (port-forward `9090` / `3200` si hace falta).

### Hotel (cluster-interno)

```env
OTEL_SERVICE_NAME=hotel-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector.observability.svc.cluster.local:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <BASE64>   # Secret, no ConfigMap
```

También: `GET /metrics/prometheus` scrapeado por Prometheus del namespace `observability`.

---

## Recursos OCI y costos

| Recurso | Acción |
|---------|--------|
| Namespace `observability` + 4 Deployments | **creados** en el worker existente |
| NodePort 31418 | **sin** LoadBalancer nuevo |
| Segundo NLB / Flexible LB / IP pública extra | **no creados** (costo) |
| HTTPS/cert | **omitido** (misma razón) |
| Requests totales obs ≈ 200m CPU / 576Mi | Hotel+MySQL intactos |

---

## Dashboard

Archivo: `observability/grafana-dashboard-multicloud.json`

Paneles: throughput, p95, error rate, chaos/resilience, bulkhead/fail-fast, series OTLP, búsqueda Tempo (`hotel-api` / `sports-api` / `cine-api`), notas R0/R1.

**Sports/Cine aparecerán en Tempo/Grafana solo cuando exporten con el `service.name` correcto.**

## Stack LOCAL (Docker) — sigue disponible

```powershell
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d prometheus grafana
```

No sustituye el collector compartido OKE.
