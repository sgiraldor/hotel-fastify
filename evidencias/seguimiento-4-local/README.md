# Evidencias locales — Seguimiento #4 (Samuel)

Fecha de captura: 2026-11-16 (máquina local).  
Entorno: Docker Desktop + `docker compose` (MySQL 8.4 + hotel-api).  
**No** incluye despliegue OCI ni resultados inventados.

## Resumen de resultados reales

| Prueba | Resultado |
|---|---|
| Docker daemon | OK (`Server Version: 29.7.2`) |
| `docker compose build api` | OK (`Image hotel-fastify-api Built`) |
| MySQL healthy | OK (`hotel-mysql`) |
| API healthy | OK (`hotel-api` puerto 3000) |
| `GET /live` | **200** |
| `GET /ready` | **200** |
| `GET /` | **200** |
| `GET /metrics` | **200** |
| `GET /metrics/prometheus` | **200** |
| `GET /api/v2/habitacion/1` + `x-trace-id` | **200**, eco del header |
| Sin `x-trace-id` | **200**, UUID generado |
| `GET /api/v2/habitacion/999999` | **404** |
| Legacy `GET /habitacion/1` | **200**, sin forzar `x-trace-id` |
| Caos sin token | **401** / header ignorado (**200**) |
| Caos enable + habitación | **503** + `Retry-After` |
| `/live` durante caos | **200** |
| Caos disable + recuperación | **200** |
| Runner `chaos/run-local.mjs` | COMPLETADO |
| Chaos Toolkit (`chaos` CLI) | **No disponible** (Python/pip ausentes) |
| `RESILIENCE_MODE=protected` | pool=10, queryTimeout=2000, requestTimeout=3000 |
| `RESILIENCE_MODE=unprotected` | pool=50, queryTimeout=30000, requestTimeout=0 |
| `npm test` | 66 passed |
| `npm run build` | OK |

## Notas

- Token de laboratorio usado solo en variables de entorno de sesión / compose; **no** versionado.
- Habitación id=1 ya existía en el volumen MySQL persistente (datos previos); no se borró el volumen.
- Fail-fast 504 ante DB lenta: cubierto por tests unitarios; en esta corrida local la DB respondió rápido (p95 ~3–6 ms), así que no se observó 504 por timeout real.
- Mejora de tasa de éxito E2E bajo caos depende del circuit breaker/timeout en **Sports**.

## Archivos

Ver JSON/TXT numerados `01`…`10` en este directorio.
