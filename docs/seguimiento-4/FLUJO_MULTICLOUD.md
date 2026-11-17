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
| **Trazabilidad W3C E2E (un solo Trace ID)** | **COMPLETA** (tras fix propagación Sports+Cine) |

## W3C E2E — trazas verificadas en Tempo OCI

Evidencias: `93-tempo-*.json`, `93-spans-*`, `93-edges-*`, `93-e2e-verdict.txt`.  
(Histórico incompleto previo: `92-*` / Trace ID `ad97747b...` — solo Sports.)

### Traza Jarrison `4d2c23ebdfcb130da2473261057148f1`

| Chequeo | Resultado |
|---------|-----------|
| Sports SERVER | **SÍ** `ac8de2d9147b061b` · flujo · ~318 ms |
| Hotel SERVER | **SÍ** `4913a9c6dbbb97ea` · parent CLIENT `553769519c1c3bd3` |
| Cine SERVER | **SÍ** `e18766bc96bd0c21` · parent CLIENT `a4d609f324b97dde` |
| Padre-hijo cruzado | **SÍ** |
| Secuencia Hotel→Cine | **SÍ** |

### Traza Daniel `4f8140a18fbaa1f98caaa8990d14341c`

| Chequeo | Resultado |
|---------|-----------|
| Sports SERVER | **SÍ** `23c4b3b33ca12a2e` · ~278 ms |
| Hotel SERVER | **SÍ** `2c3cb8f686787eca` · parent `ee9f09d7a04a1788` |
| Cine SERVER | **SÍ** `b76594a36c80eebc` · parent `bc21953c3ab7f36b` |
| Padre-hijo cruzado | **SÍ** |
| Secuencia Hotel→Cine | **SÍ** |

Cadena típica: Sports SERVER → `flujo.multicloud` → Hotel CLIENT→**Hotel SERVER** → luego Cine CLIENT→**Cine SERVER**.  
Nota: duración Hotel SERVER (~1–2 ms) es in-process; el RTT multicloud está en el CLIENT Sports (~180–230 ms).

## Observabilidad compartida (OKE)

Collector: `https://157.137.233.183:31443` (TLS + Basic).  
Grafana: `kubectl -n observability port-forward svc/grafana 3001:3000`

| service.name | Tempo | Prometheus | Misma traza W3C E2E |
|--------------|-------|------------|---------------------|
| `hotel-api` | **sí** | **sí** | **sí** (`93-*`) |
| `sports-api` | **sí** | **sí** | **sí** |
| `cine-api` | **sí** | **sí** | **sí** |

```powershell
kubectl -n observability port-forward svc/tempo 13200:3200
curl.exe -sS "http://127.0.0.1:13200/api/traces/4d2c23ebdfcb130da2473261057148f1"
curl.exe -sS "http://127.0.0.1:13200/api/traces/4f8140a18fbaa1f98caaa8990d14341c"
```

## Hotel OCI

2 réplicas Ready + MySQL Ready + NLB. Evidencia `90-oke-hotel.txt`.

## Experimento A (indisponibilidad Hotel)

Ejecutado. R0 y la R1 definitiva están en [`RESULTADOS_EXPERIMENTOS.md`](./RESULTADOS_EXPERIMENTOS.md). El procedimiento queda en [`RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md`](./RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md).
