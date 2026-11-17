# Experimento Samuel — Indisponibilidad controlada

## Hipótesis

Si Hotel no está disponible, las llamadas de Sports a `GET /api/v2/habitacion/:id` reciben **503** rápido (con `x-trace-id`), `/live` permanece sano, y al desactivar el interruptor el servicio se recupera.

## Steady state

- `GET /live` → 200
- `GET /api/v2/habitacion/:id` → 200
- Métrica: success_rate ≈ 100%, caos inactive

## Inyección

1. **Interruptor propio:** env `CHAOS_DEPENDENCY_DOWN=true` o API `/api/v2/chaos/dependency` con `CHAOS_LAB_TOKEN`.
2. **Declarativo:** `chaos/experiment-hotel-dependency.json` (+ `chaos/run-local.mjs`).

No modifica MySQL. No afecta Cine/Sports. Probes `/live` excluidos.

## Baseline / R0 / R1 del callee local

Ver `scripts/experiments/README.md`. Ahí `RESILIENCE_MODE` cambia fail-fast y bulkhead de Hotel. Esa pareja local no es la R0/R1 del flujo con Sports.

## Corrida definitiva con Sports

Baseline: 289 completas, disponibilidad 100 %, p95 312,02 ms.  
R0: 320 fallidas, disponibilidad 0 %, p95 224,13 ms.  
R1: 349 parciales, 0 fallidas, disponibilidad degradada 100 %, p95 234,60 ms.

El 100 % de R1 son parciales. Hotel no se recuperó durante k6. Detalle y trazas: [`RESULTADOS_EXPERIMENTOS.md`](./RESULTADOS_EXPERIMENTOS.md).

## Evidencias

Las cifras OCI salen de `evidencias/seguimiento-4-local/94-r0-retry-cobertura.txt` y `96-r1-retry-cobertura.txt`. Las cifras locales salen de `scripts/experiments/results/` y de `50-*` / `60-*`. No se inventan métricas de Jarrison ni de Daniel.

## Reversión

```bash
./chaos/revert-chaos.ps1
# o POST action=disable
```

## Demo OCI (ejecutada)

Procedimiento de las dos réplicas, carga y métricas:  
[`RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md`](./RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md).  
No repetir el 503.

B (MySQL) y C (bulkhead) son **complementarios** en LOCAL y **no** reemplazan este experimento A.
