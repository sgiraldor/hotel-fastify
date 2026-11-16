# Baseline / Ronda 0 / Ronda 1 (Hotel)

## Perfil de carga

**LOCAL PROVISIONAL** (`run-round.mjs`) hasta que Jarrison entregue el perfil k6 común.

Alternar resiliencia sin reescribir historial:

```bash
# Ronda 0 — sin protecciones agresivas
export RESILIENCE_MODE=unprotected

# Ronda 1 — fail-fast + bulkhead
export RESILIENCE_MODE=protected
```

Reiniciar el proceso Node tras cambiar la variable (se lee al arranque).

## Secuencia

```bash
export HOTEL_BASE_URL=http://127.0.0.1:3000
export CHAOS_LAB_TOKEN=lab-token
export HOTEL_HABITACION_ID=1

# Baseline (sin caos)
node scripts/experiments/run-round.mjs baseline

# R0: caos ON + unprotected
# (API levantada con RESILIENCE_MODE=unprotected)
node scripts/experiments/run-round.mjs r0

# R1: caos ON + protected
# (reiniciar API con RESILIENCE_MODE=protected)
node scripts/experiments/run-round.mjs r1

node scripts/experiments/compare-rounds.mjs scripts/experiments/results/r0-....json scripts/experiments/results/r1-....json
```

## Umbral propuesto (local)

| Señal | Baseline | Bajo caos |
|---|---|---|
| success_rate habitacion V2 | ≥ 99% | ~0% (503 esperado en Hotel) |
| /live | 200 | 200 |
| p95 (protected vs hang) | bajo | R1 < R0 si hay demora DB |

La mejora E2E de tasa de éxito del **flujo completo** la demuestra Sports con circuit breaker/timeouts; Hotel demuestra fail-fast y blast radius controlado.
