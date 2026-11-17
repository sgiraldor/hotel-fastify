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
| **Observabilidad OTel E2E** | **Parcial**: solo `hotel-api` en Tempo/Prometheus del collector OCI |

HTTP 200 E2E **no implica** que las tres APIs ya exporten spans al collector compartido.

## Observabilidad compartida (OKE)

Collector: `https://157.137.233.183:31443` (TLS + Basic).  
Grafana: `kubectl -n observability port-forward svc/grafana 3001:3000`

| service.name | Tempo | Prometheus (label) |
|--------------|-------|--------------------|
| `hotel-api` | **sí** | **sí** |
| `sports-api` | **no** (0 traces) | **no** |
| `cine-api` | **no** (0 traces) | **no** |

Evidencias: `90-tempo-*.json`, `90-prom-*.json`, `90-tempo-service-summary.txt`.

### Cuando lleguen spans AWS/GCP — correlacionar Trace ID

Tras un `GET /api/v2/flujo/...`, anotar `x-trace-id` (negocio) y, si Sports propaga W3C, el Trace ID OTel:

```powershell
# 1) Llamar flujo y guardar headers
curl.exe -sS -D headers.txt -o body.json "http://3.21.120.51:30080/api/v2/flujo/1/1/1"
# Leer x-trace-id del header / traceId del body

# 2) Port-forward Tempo
kubectl -n observability port-forward svc/tempo 13200:3200

# 3) Buscar por servicio (debe devolver traces > 0)
curl.exe -sS "http://127.0.0.1:13200/api/search?tags=service.name%3Dsports-api&limit=5"
curl.exe -sS "http://127.0.0.1:13200/api/search?tags=service.name%3Dcine-api&limit=5"
curl.exe -sS "http://127.0.0.1:13200/api/search?tags=service.name%3Dhotel-api&limit=5"

# 4) Si se conoce el Trace ID OTel (32 hex), abrir traza completa:
# curl.exe -sS "http://127.0.0.1:13200/api/traces/<TRACE_ID_OTEL>"
# En Grafana Explore → Tempo: pegar Trace ID; comprobar spans hotel-api + sports-api + cine-api
```

`x-trace-id` de negocio y Trace ID OTel son distintos; la unión E2E en Tempo exige propagación `traceparent` desde Sports.

## Hotel OCI

2 réplicas Ready + MySQL Ready + NLB. Evidencia `90-oke-hotel.txt`.

## Experimento A (indisponibilidad Hotel)

Runbook listo, **sin ejecutar**: [`RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md`](./RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md).
