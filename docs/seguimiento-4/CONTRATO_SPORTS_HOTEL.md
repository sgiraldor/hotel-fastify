# Contrato técnico exacto Sports → Hotel (Jarrison)

Hotel **no** mitiga sola la indisponibilidad total (experimento A: R0=R1=100% error).  
Sports, como caller/coordinador, debe implementar la resiliencia E2E.

Guía compacta de arranque: [`GUIA_INTEGRACION_JARRISON.md`](./GUIA_INTEGRACION_JARRISON.md).

## 1. Endpoint final

```
GET /api/v2/habitacion/:id
Base lab OCI: http://149.130.165.30
Ejemplo:      GET http://149.130.165.30/api/v2/habitacion/1 → 200 + x-trace-id
```

## 2. Headers obligatorios (ida)

| Header | Valor |
|--------|--------|
| `x-trace-id` | UUID de negocio del flujo E2E (Sports lo genera) |
| `traceparent` | W3C Trace Context (OTel); no sustituye a `x-trace-id` |

## 3. Códigos y semántica (no reinterpretar)

| HTTP | `code` (si JSON) | ¿Éxito de negocio? | Acción Sports |
|------|------------------|--------------------|---------------|
| 200 | — | **Sí** | Continuar a Cine |
| 503 | `CHAOS_DEPENDENCY_DOWN` / `DB_BULKHEAD_REJECTED` / `DB_POOL_QUEUE_LIMIT` | **No** | Fallo de dependencia |
| 504 | `DB_QUERY_TIMEOUT` | **No** | Fail-fast callee; no inventar habitación |
| timeout cliente | — | **No** | Contar fallo dependencia |
| 4xx | — | **No** | No reintentar ciego |

Cuerpo de error incluye `available: false` cuando aplica.  
**Prohibido** tratar 503/504/timeout como éxito parcial con datos inventados de habitación.

## 4. Respuesta parcial E2E (Sports)

Cuando Hotel falla, Sports debe responder al cliente algo del estilo:

```json
{
  "status": "partial",
  "hotel": { "available": false, "httpStatus": 503, "code": "CHAOS_DEPENDENCY_DOWN" },
  "cine": null,
  "x-trace-id": "<uuid>"
}
```

Estado explícito `partial` / `degraded` — nunca 200 de negocio fingiendo Hotel OK.

## 5. Timeout HTTP (Sports → Hotel)

| Parámetro | Valor sugerido lab |
|-----------|--------------------|
| connect timeout | ≤ 1 s |
| request timeout | **2–3 s** (alineado a fail-fast Hotel protected) |
| reintentos | ≤ 1, solo idempotente GET, con jitter; **abortar si CB abierto** |

## 6. Circuit breaker (obligatorio para experimento A)

| Señal | Umbral sugerido lab |
|-------|---------------------|
| Abrir CB | ≥ 5 fallos (503/504/timeout) en ventana 30 s |
| Half-open | 1 probe tras 15–30 s |
| Métrica | `sports_hotel_cb_state`, `sports_hotel_failures_total` |

Con CB abierto: **no** martillar Hotel; devolver respuesta parcial inmediata.

## 7. Propagación de traza

1. Generar `x-trace-id` al inicio.
2. Reenviar `x-trace-id` + `traceparent` a Hotel y Cine.
3. Reflejar `x-trace-id` en la respuesta al cliente.
4. Correlacionar en logs/métricas E2E por `x-trace-id`.

## 8. Métricas E2E que Jarrison debe exponer

- `sports_e2e_success_rate` (éxito solo si Hotel 200 **y** resto OK)
- `sports_hotel_dependency_error_rate` (503/504/timeout)
- `sports_hotel_p95_ms`
- `sports_hotel_cb_open` (gauge)
- throughput exitoso E2E vs intentos

## 9. Chaos Gate (lab)

```
POST /api/v2/chaos/dependency
Header: x-chaos-token: <CHAOS_LAB_TOKEN>
Body: {"action":"enable"|"disable","durationSeconds":60}
```

Solo con ventana autorizada. No contra OCI sin permiso explícito.  
En OCI un POST al NLB cambia un solo pod. La corrida de las dos réplicas está en el runbook del experimento A.

## 10. Relación con evidencias Hotel

| Experimento | Qué prueba Hotel | Qué debe probar Sports |
|-------------|------------------|------------------------|
| **A** — 503 total (**obligatorio**) | Blast radius + contrato 503; R0=R1=100% error | CB + timeout + partial status |
| B — MySQL lenta (**complementario**) | Fail-fast callee; no reemplaza A | Timeout caller alineado; no reintentos agresivos |
| C — Bulkhead (**complementario**) | Aislamiento concurrency; success ↓ | No martillar tras 503 rápidos |

## 11. Estado de entrega Hotel → Sports

- API OCI operativa (2 réplicas + MySQL).
- Contrato `GET /api/v2/habitacion/:id` estable.
- Chaos Gate listo; demo OCI documentada y **no ejecutada** hasta autorización.
- Pendiente exclusivo Sports: timeout, CB, `partial`, propagación de traza E2E y métricas.
