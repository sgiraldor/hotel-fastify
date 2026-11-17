# Guía compacta — integración Sports → Hotel (Jarrison)

Hotel está listo en OCI. Esta guía es el contrato mínimo para integración inmediata.

## URL y endpoint

```
Base OCI (lab):  http://149.130.165.30
Contrato:        GET /api/v2/habitacion/:id
Ejemplo:         GET http://149.130.165.30/api/v2/habitacion/1
```

Éxito (200):

```json
{
  "id": 1,
  "numeroHabitacion": "101",
  "precioHabitacion": "150000.00",
  "estadoHabitacion": "Disponible",
  "tipoHabitacion": "Doble"
}
```

Header de respuesta siempre: `x-trace-id`.

## Headers de ida (obligatorios)

| Header | Quién | Nota |
|--------|-------|------|
| `x-trace-id` | Sports genera UUID | Identidad de negocio E2E |
| `traceparent` | Sports (OTel) | No sustituye a `x-trace-id` |

## Timeout (Sports → Hotel)

| Parámetro | Valor lab |
|-----------|-----------|
| connect | ≤ 1 s |
| request | **2–3 s** |
| reintentos | ≤ 1, solo GET, con jitter; **abortar si CB abierto** |

## Circuit breaker (obligatorio para experimento A)

| Señal | Umbral lab |
|-------|------------|
| Abrir | ≥ 5 fallos (503 / 504 / timeout) en 30 s |
| Half-open | 1 probe tras 15–30 s |
| Con CB abierto | respuesta parcial inmediata; no martillar Hotel |

## Semántica HTTP (no reinterpretar)

| HTTP | code | ¿Éxito negocio? |
|------|------|-----------------|
| 200 | — | **Sí** |
| 503 | `CHAOS_DEPENDENCY_DOWN` / `DB_BULKHEAD_REJECTED` / `DB_POOL_QUEUE_LIMIT` | **No** |
| 504 | `DB_QUERY_TIMEOUT` | **No** |
| timeout cliente | — | **No** |

**Prohibido** inventar habitación o tratar 503/504/timeout como éxito.

## Respuesta parcial E2E (Sports)

```json
{
  "status": "partial",
  "hotel": {
    "available": false,
    "httpStatus": 503,
    "code": "CHAOS_DEPENDENCY_DOWN"
  },
  "cine": null,
  "x-trace-id": "<uuid>"
}
```

## Trace ID

1. Generar `x-trace-id` al inicio del flujo.
2. Reenviar `x-trace-id` + `traceparent` a Hotel y Cine.
3. Devolver el mismo `x-trace-id` al cliente.
4. Correlacionar logs/métricas E2E por ese id.

## Chaos Gate (solo ventana autorizada)

```
POST /api/v2/chaos/dependency
Header: x-chaos-token: <CHAOS_LAB_TOKEN>
Body: {"action":"enable"|"disable","durationSeconds":60}
```

Máximo temporal del API: 300 s. `/live` y `/ready` no se inyectan.

## Qué ya demostró Hotel (no duplicar en Sports)

| Exp. | Resultado Hotel | Qué falta en Sports |
|------|-----------------|---------------------|
| **A** (obligatorio 503) | R0=R1=**100% error** | CB + timeout + `partial` + métricas E2E |
| B (MySQL lenta, LOCAL) | fail-fast acota p95; success ↓ | timeout caller alineado |
| C (bulkhead, LOCAL) | aislamiento sí; success ↓ | no martillar tras 503 rápidos |

Detalle: `CONTRATO_SPORTS_HOTEL.md` y `RESULTADOS_EXPERIMENTOS.md`.
