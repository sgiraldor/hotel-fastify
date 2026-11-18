# Runbook — Experimento A (Hotel OCI + mitigación Sports)

**Ya ejecutado.** R0 y la R1 definitiva quedaron cubiertas. No se repiten. Este archivo conserva el procedimiento que se usó.  
No saturar Sports/Cine. No tocar MySQL, réplicas, credenciales ni el tag `v1.1.0`.

La comparación definitiva no usa el `RUN_ID` de preparación `hotel-503-prueba-01`. Usa R0 `hotel503-r0-retry-20261117-004150` y R1 `hotel503-r1-retry-20261117-011303`. Evidencias: `evidencias/seguimiento-4-local/94-r0-retry-cobertura.txt` y `96-r1-retry-cobertura.txt`.

## Interruptor

`chaosUntilMs` vive en la memoria de cada proceso. Un POST al NLB cambia un solo pod.

`chaos/chaos-replicas.ps1` entra por `kubectl exec` a cada pod Ready y llama a `127.0.0.1:3000`. El token no sale del contenedor y el script no lo imprime.

| Pieza | Comportamiento |
|---|---|
| `enable` | exige `-ConfirmExperiment`; duración 1–300 s; en R0 y R1 se usan **120 s nuevos** |
| Caducidad | cada proceso vuelve a 200 aunque se caiga k6 o esta sesión |
| Activación parcial | si una réplica no queda en 503, el script hace `disable` en todas, imprime `k6_permitido=no` y sale 1 |
| Ventana | k6 necesita 80 s (75 s de stages + 5 s de `gracefulRampDown`). Si al terminar el `enable` queda menos, apaga las dos réplicas y no autoriza k6 |
| `disable` | apaga el temporizador de cada proceso; no toca MySQL |
| `CHAOS_DEPENDENCY_DOWN=true` | no usar: no caduca y solo entra tras recrear el pod |
| `/live` y `/ready` | siguen 200 |

Kubeconfig del API: endpoint público actual `https://129.38.95.80:6443`. El anterior `157.137.215.153` ya no responde.

## Perfil de carga

Archivo canónico, sin cambios locales: `load/k6/flujo-profile-shared.js`.  
Salidas en `load/results/` (no se versionan).

| Parámetro | Valor |
|---|---|
| Target | `http://3.21.120.51:30080` |
| Ruta | `GET /api/v2/flujo/1/1/1` |
| Stages | 15 s → 2 VU, 45 s → 4 VU, 15 s → 0 VU |
| Sleep | 0.3 s |
| Variables | `BASE_URL`, `TORNEO_ID=1`, `HABITACION_ID=1`, `PELICULA_ID=1`, `RUN_ID=hotel-503-prueba-01`, `ROUND` |

| Ronda | Hotel | `RESILIENCE_ENABLED` | `HOTEL_FALLBACK_ENABLED` | k6 |
|---|---|---|---|---|
| Baseline | normal, ya medido | `true` | `true` | no repetir |
| R0 | 503 en las dos réplicas, activación nueva de 120 s | `false` | `false` | `ROUND=r0` |
| R1 | 503 en las dos réplicas, **otra** activación de 120 s | `true` | `true` | `ROUND=r1` |

Los flags de Sports los cambia Jarrison. Este repo no los toca.

## Clasificación (script canónico, no editado)

Un HTTP 200 con `habitacion` y `pelicula` es **partial** si `status=partial`, o `degraded=true`, o `habitacion.origenResiliencia=fallback`. Sin esas señales es **full**. Todo lo demás es **failed**, también un 200 al que le falte `pelicula`.

Eso reconoce el 200 de fallback cuando la habitación trae `origenResiliencia=fallback` y la película sigue en el cuerpo. No se cuenta como completa.

Coordinar con Jarrison, sin alterar el script: si el fallback nuevo omite `pelicula` o usa solo `hotel` sin `habitacion`, el perfil lo cuenta como **failed**. El ejemplo antiguo de este repo (`hotel` + `cine: null`) no coincide con el clasificador.

## Métricas por ronda

El JSON de `load/results/<ROUND>-hotel-503-prueba-01.json` separa:

| Métrica | Campo |
|---|---|
| Full | `classification.full` y `fullSuccessRate` |
| Partial | `classification.partial` y `partialRate` |
| Failed | `classification.failed` y `errorRate` |
| Disponibilidad total o degradada | `classification.availabilityRate` = (full + partial) / total |
| p95 | `metrics.http_req_duration_p95` |
| Hotel 503 por pod | JSON de `enable`/`status`: `habitacionStatus` 503, `habitacionCode=CHAOS_DEPENDENCY_DOWN`, `/live` 200, delta de `injections` |
| Recuperación | segundos desde `disable` hasta hábito 200 en las dos réplicas, y hasta un flujo Sports full |
| Trazas | `x-trace-id` de una respuesta y un Trace ID W3C con `sports-api`, `hotel-api` y `cine-api` |

La parcial no entra en `full`. El baseline definitivo del grupo es el RUN_ID `hotel503-baseline-20261117-003033`: 289 completas, 0 parciales, 0 fallidas y p95 312,02064 ms, archivado en `evidencias/seguimiento-4-local/baseline-hotel503-baseline-20261117-003033.json`. La tabla redondea el p95 a 312,02 ms. Una medición anterior del `RUN_ID` `hotel-503-prueba-01` reportó 302 completas y p95 313,39 ms, y no entra en la tabla final.

## Comandos

```powershell
# Estado normal. No activa el fallo.
./chaos/chaos-replicas.ps1 -Action status

# R0. Solo tras imagen Sports confirmada, flags false/false y dos replicas Sports Ready.
./chaos/chaos-replicas.ps1 -Action enable -DurationSeconds 120 -ConfirmExperiment
# k6 solo si la salida trae k6_permitido=si y el reloj aun no pasa k6_start_before.
# k6 run -e BASE_URL=http://3.21.120.51:30080 -e TORNEO_ID=1 -e HABITACION_ID=1 -e PELICULA_ID=1 -e RUN_ID=hotel-503-prueba-01 -e ROUND=r0 load/k6/flujo-profile-shared.js
./chaos/chaos-replicas.ps1 -Action disable
./chaos/chaos-replicas.ps1 -Action status

# R1. Activacion nueva de 120 s. Flags true/true. No reutilizar la ventana de R0.
./chaos/chaos-replicas.ps1 -Action enable -DurationSeconds 120 -ConfirmExperiment
# k6 run -e BASE_URL=http://3.21.120.51:30080 -e TORNEO_ID=1 -e HABITACION_ID=1 -e PELICULA_ID=1 -e RUN_ID=hotel-503-prueba-01 -e ROUND=r1 load/k6/flujo-profile-shared.js
./chaos/chaos-replicas.ps1 -Action disable
./chaos/chaos-replicas.ps1 -Action status

# Flujo completo, una peticion, cuando las dos replicas ya responden 200.
# curl.exe -sS -D - -o flujo-post.json "http://3.21.120.51:30080/api/v2/flujo/1/1/1"
```

Si k6 no ha arrancado al llegar `k6_start_before`, ejecutar `disable` y no usar esa medición. La siguiente ronda exige otro `enable` de 120 s.

## Recuperación

`disable` y luego `status`: `activo=false`, `envDown=false`, habitación 200 y `/live` 200 en los dos pods. No borra datos ni cambia réplicas. Si la sesión muere después del `enable`, cada proceso cumple su temporizador. Al reconectar, `disable` y `status`.

`./chaos/revert-chaos.ps1` contra el NLB se niega.

## Relación con evidencias LOCAL

Experimento A LOCAL (`40-*`, `42-*`): con 503, Hotel falla igual en R0 y R1. Esta corrida mide la mitigación de Sports.
