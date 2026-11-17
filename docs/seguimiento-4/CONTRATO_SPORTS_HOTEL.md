# Contrato final Sports → Hotel (para Jarrison)

## Endpoint de integración

```
GET /api/v2/habitacion/:id
Host: http://149.130.165.30   # OCI NLB (lab)
Header requerido: x-trace-id: <uuid>
```

### Respuestas

| HTTP | Significado | Acción esperada en Sports |
|------|-------------|---------------------------|
| 200 | Habitación OK (JSON) | Continuar flujo hacia Cine |
| 503 | Hotel indisponible (caos/lab o saturación controlada) | **No éxito**. Abrir/continuar circuit breaker; retry solo si política lo permite |
| 4xx | Error de cliente | No reintentar ciegamente |
| timeout | Fail-fast lado caller | Contar como fallo de dependencia |

### Headers de respuesta

- `x-trace-id`: eco del correlacionador (obligatorio conservar end-to-end)

### Health (no usar como contrato de negocio)

- `GET /live` → liveness
- `GET /ready` → readiness (incluye DB)

## Interruptor de caos (lab)

```
POST /api/v2/chaos/dependency
Header: x-chaos-token: <CHAOS_LAB_TOKEN>
Body: {"action":"enable"|"disable","durationSeconds":60}
```

Solo con autorización. **No** en OKE sin ventana controlada.

## Expectativa de resiliencia

Hotel (callee) aporta:

1. Fail-fast: timeouts request/query en `RESILIENCE_MODE=protected`
2. Bulkhead: `DB_POOL_LIMIT` reducido

Sports (caller) debe aportar la mitigación E2E de **indisponibilidad total de Hotel** (evidencia k6 R0≈R1 con error_rate=100%).

## Perfil de carga

Hasta recibir k6 común de Jarrison, Hotel usó perfil provisional `LOCAL_PROVISIONAL_K6_V5_35S` (5 VU, 35s, mismos escalones). Sustituir sin cambiar la comparación R0/R1.
