# Contrato de observabilidad compartida (coordina Samuel)

## Servicios

| service.name | Cloud | Owner |
|---|---|---|
| `hotel-api` | OCI / OKE | Samuel |
| `sports-api` | AWS / EKS | Jarrison |
| `cine-api` | GCP / GKE | Daniel |

## Correlación

1. Sports genera `x-trace-id` (UUID) al inicio del flujo E2E.
2. Sports lo reenvía a Hotel y Cine.
3. Hotel lo refleja en respuesta y logs (`xTraceId`).
4. OTel propaga `traceparent`/`tracestate` (W3C). **No confundir** otel trace id con span id ni con `x-trace-id`.

## Export Hotel

```env
OTEL_SERVICE_NAME=hotel-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

Endpoints:

- `GET /metrics` — JSON (Canary, no romper)
- `GET /metrics/prometheus` — texto Prometheus por pod (scraping)
- OTLP traces/metrics cuando hay endpoint configurado

## Dashboard

Importar `observability/grafana-dashboard-hotel.json`.

Paneles: RPS, p95, 5xx, chaos active, resilience mode.

**Un dashboard vacío no es evidencia.** Requiere scrape real + carga.

## Stack sugerido (simple)

OpenTelemetry Collector + Prometheus + Grafana + Tempo/Jaeger.
