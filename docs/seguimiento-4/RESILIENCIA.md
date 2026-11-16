# Patrones de resiliencia en Hotel

## 1. Fail-fast (timeouts)

- `REQUEST_TIMEOUT_MS` (Fastify) en modo `protected`.
- `conTimeoutConsulta` en `GET /api/v2/habitacion/:id` → HTTP **504** si la DB tarda.
- Efecto medible: **p95 más bajo** ante lentitud vs modo unprotected.

## 2. Bulkhead (aislamiento de pool)

- `DB_POOL_LIMIT` limita conexiones MySQL concurrentes.
- Evita que una ráfaga agote recursos del proceso/DB.
- Efecto medible: estabilidad de `/live` y contención de errores bajo carga.

## Qué NO cuenta como resiliencia E2E en Hotel

Un 503 con mensaje bonito **no** mejora la tasa de éxito del flujo Cliente→Sports→Hotel→Cine.  
Sports debe implementar **timeout de cliente + circuit breaker/retry** (contrato para Jarrison).

## Toggle R0/R1

```bash
RESILIENCE_MODE=unprotected   # R0
RESILIENCE_MODE=protected     # R1 (default)
```
