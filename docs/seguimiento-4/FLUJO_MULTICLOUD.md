# Flujo multicloud — estado real (Samuel / Hotel)

## Endpoints confirmados

| API | URL |
|-----|-----|
| Sports (AWS) | `http://3.21.120.51:30080` · `GET /api/v2/flujo/1/1/1` |
| Hotel (OCI) | `http://149.130.165.30/api/v2/habitacion/1` |
| Cine (GCP) | `http://35.239.107.54/api/v2/peliculas/1` |

## Verificación HTTP E2E (Sports)

Evidencia: `evidencias/seguimiento-4-local/90-sports-flujo.*`

| Campo | Valor observado |
|-------|-----------------|
| HTTP | **200** |
| `status` | `success` |
| `degraded` | `false` |
| `degradedDependencies` | `[]` |
| Hotel | habitación `id=1` / `101` presente |
| Cine | película `id=1` presente |
| `x-trace-id` / `traceId` | UUID presente (negocio Sports) |
| Latencia cliente | ~0.53 s (una petición, no k6) |

Jarrison reporta además k6 230/230 OK y p95 ~320 ms (mocks **no** sustituyen OCI real; esta prueba usó Hotel OCI vía Sports).

### Separación crítica

| Capa | Estado |
|------|--------|
| **Integración HTTP multicloud** | **Funciona** (Sports orquesta Hotel+Cine → 200 completo) |
| **Export OTLP por servicio** | **OK** los tres (`service_name` en Prometheus) |
| **Trazabilidad W3C E2E (un solo Trace ID)** | **NO completa** — ver sección siguiente |

HTTP 200 E2E **≠** traza W3C compartida con SERVER spans de Hotel y Cine.

## W3C Trace ID real (Jarrison) — verificación Tempo

| Campo | Valor |
|-------|--------|
| Trace ID | `ad97747b16a40a3c738b6591e1f59309` |
| `x-trace-id` | `otel-oci-live-20261116230837-flujo-1` |
| Root Sports span | `354377a4a5339766` · `GET /api/v2/flujo/...` · ~264 ms |

| Servicio en **esa** traza | ¿Presente? | Notas |
|---------------------------|------------|--------|
| `sports-api` | **SÍ** | server + internal + **CLIENT** a Hotel/Cine |
| `hotel-api` (SERVER del flujo) | **NO** | no hay span Hotel ~177 ms hijo del CLIENT Sports |
| `cine-api` (SERVER del flujo) | **NO** | ausente |

Padre-hijo **dentro de Sports** (sí, secuencial):

1. `flujo.multicloud` → `hotel.get_habitacion` → CLIENT `GET /api/v2/habitacion/:id` (~177 ms)
2. luego → `cine.get_pelicula` → CLIENT `GET /api/v2/peliculas/:id` (~52 ms)

**Hotel sí propaga** cuando recibe `traceparent` (probe Samuel: log `otelTraceId=ad97747b...`).  
Pendiente típico: Sports debe **inyectar `traceparent`** en el HTTP real a Hotel/Cine; Cine debe **extraer** y exportar el SERVER span al mismo Trace ID.

Evidencias: `92-tempo-trace-*.json`, `92-spans-*.txt`, `92-e2e-verdict.txt`.

## Observabilidad compartida (OKE)

Collector: `https://157.137.233.183:31443` (TLS + Basic).  
Grafana: `kubectl -n observability port-forward svc/grafana 3001:3000`

| service.name | Tempo (traces sueltas) | Prometheus `service_name` | Misma traza W3C E2E |
|--------------|------------------------|---------------------------|---------------------|
| `hotel-api` | **sí** | **sí** | **no** (en traza de Jarrison) |
| `sports-api` | **sí** | **sí** | **sí** (raíz) |
| `cine-api` | **sí** | **sí** | **no** (en traza de Jarrison) |

Evidencias: `90-*` HTTP; `91-*` Cine OTLP; `92-*` W3C E2E.

### Comando Tempo (Trace ID conocido)

```powershell
kubectl -n observability port-forward svc/tempo 13200:3200
curl.exe -sS "http://127.0.0.1:13200/api/traces/ad97747b16a40a3c738b6591e1f59309"
# Éxito E2E = batches con service.name sports-api + hotel-api + cine-api y parents cruzados
```

`x-trace-id` (negocio) ≠ Trace ID OTel; la unión en Tempo exige `traceparent` de punta a punta.

## Hotel OCI

2 réplicas Ready + MySQL Ready + NLB. Evidencia `90-oke-hotel.txt`.

## Experimento A (indisponibilidad Hotel)

Runbook listo, **sin ejecutar**: [`RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md`](./RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md).
