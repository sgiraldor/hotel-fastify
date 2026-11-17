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

## Baseline / R0 / R1

Ver `scripts/experiments/README.md`.

- Baseline: sin caos.
- R0: caos + `RESILIENCE_MODE=unprotected`.
- R1: caos + `RESILIENCE_MODE=protected` (mismos requests/intensidad).

## Evidencias

Solo archivos generados en `scripts/experiments/results/` o capturas cloud autorizadas. Pendiente de OKE/OTLP real = no inventar.

## Reversión

```bash
./chaos/revert-chaos.ps1
# o POST action=disable
```

## Demo OCI (preparada, no ejecutada)

Procedimiento de las dos réplicas, carga y métricas:  
[`RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md`](./RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md).

B (MySQL) y C (bulkhead) son **complementarios** en LOCAL y **no** reemplazan este experimento A.
