# Baseline / Ronda 0 / Ronda 1 (Hotel)

## Perfil de carga (provisional Samuel)

Archivo: `k6-hotel-profile.js` — **LOCAL_PROVISIONAL_K6_V5_35S**

| Parámetro | Valor (fijo entre rondas) |
|-----------|---------------------------|
| Escalones | 5s→5 VU, 25s hold, 5s→0 |
| Concurrencia pico | 5 VU |
| Duración | ~35 s |
| Endpoint | `GET /api/v2/habitacion/:id` |

Sustituir por el k6 común de Jarrison **sin** cambiar parámetros entre R0 y R1.

## Ejecutar las tres rondas

```powershell
$env:CHAOS_LAB_TOKEN="lab-token"
.\scripts\experiments\run-k6-rounds.ps1
```

Secuencia:

1. **Baseline** — `RESILIENCE_MODE=protected`, sin caos
2. **R0** — `unprotected` + mismo caos (`durationSeconds=40`)
3. **R1** — `protected` + mismo caos

Resultados: `scripts/experiments/results/k6-*-summary.json` y `evidencias/seguimiento-4-local/42-*`.

## Runner curl legacy

`run-round.mjs` permanece como respaldo de bajo volumen; preferir k6.

## Lectura de resultados

Para el fallo de **indisponibilidad total** (503 del interruptor), esperar error_rate≈100% en R0 y R1. Eso **no** invalida fail-fast/bulkhead (valen para DB lenta/saturación); la mitigación E2E es responsabilidad de Sports.
