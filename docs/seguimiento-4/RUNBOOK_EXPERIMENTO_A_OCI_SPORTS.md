# Runbook — Experimento A (Hotel OCI + mitigación Sports)

**NO EJECUTAR** la inyección ni k6 hasta la ventana autorizada con Jarrison.  
No saturar Sports/Cine. No tocar MySQL, réplicas, credenciales ni el tag `v1.1.0`.

## Interruptor

`chaosUntilMs` vive en la memoria de cada proceso (`src/plugins/chaos-dependency.plugin.ts`).  
Un POST a `http://149.130.165.30` entra por el NLB y cambia **un solo** pod.

Para las dos réplicas, cada ronda usa `chaos/chaos-replicas.ps1`, que hace `kubectl exec` a **cada** pod Ready y llama a `127.0.0.1:3000` con el token que ya está en el contenedor. El script no imprime el token.

| Pieza | Comportamiento |
|---|---|
| `action=enable` | 503 solo en ese proceso, entre 1 y 300 s |
| Caducidad | el proceso vuelve a 200 aunque se caiga k6 o esta sesión |
| `action=disable` | apaga el temporizador de ese proceso; no toca MySQL |
| `CHAOS_DEPENDENCY_DOWN=true` | **no usar** en esta ventana: no caduca y solo entra tras recrear el pod |
| `/live` y `/ready` | siguen 200 |

`enable` sin `-ConfirmExperiment` se rechaza.

## Perfil de carga (idéntico en Baseline, R0 y R1)

Archivo de Jarrison: `load/k6/flujo-profile-shared.js`.  
**No está en este repositorio.** No sustituirlo por otro script.

| Parámetro | Valor |
|---|---|
| Target | `http://3.21.120.51:30080` |
| Ruta | `GET /api/v2/flujo/1/1/1` |
| Stages | 15 s → 2 VU, 45 s → 4 VU, 15 s → 0 VU (75 s) |
| Sleep | 0.3 s |
| Variables | `BASE_URL`, `TORNEO_ID=1`, `HABITACION_ID=1`, `PELICULA_ID=1`, `RUN_ID` (el mismo en las tres rondas), `ROUND=baseline\|r0\|r1` |

Sports, en las dos réplicas Ready, antes de arrancar k6:

| Ronda | Hotel | `RESILIENCE_ENABLED` | `HOTEL_FALLBACK_ENABLED` |
|---|---|---|---|
| Baseline | normal | `true` | `true` |
| R0 | HTTP 503 en las dos réplicas | `false` | `false` |
| R1 | el mismo HTTP 503 | `true` | `true` |

Duración del interruptor en R0 y R1: **120 s** (cubre los 75 s de k6). Arrancar k6 en los 30 s siguientes a la verificación 503. La misma duración y los mismos pods en las dos rondas.

## Métricas (separadas; la parcial no cuenta como completa)

Clasificar cada respuesta de Sports. No sumar parciales dentro de completas.

| Métrica | Definición |
|---|---|
| Respuesta completa | HTTP 200, `status=success`, `degraded=false` y Hotel disponible |
| Respuesta parcial | HTTP 200 con `status=partial` o `degraded=true` |
| Respuesta fallida | HTTP distinto de 200, timeout o cuerpo sin ese contrato |
| p95 | `http_req_duration` p95 de esa ronda, sin mezclar rondas |
| Throughput completas | completas / 75 s |
| Throughput parciales | parciales / 75 s |
| Recuperación Hotel | segundos desde `disable` hasta que **las dos** réplicas devuelven habitación 200 |
| Recuperación E2E | segundos desde `disable` hasta un flujo Sports completo |
| Hotel 503 | en cada pod: `habitacion` 503 `CHAOS_DEPENDENCY_DOWN`, `/live` 200, delta de `injections` |
| Trazas | un Trace ID W3C por ronda con spans de `sports-api`, `hotel-api` y `cine-api` |

Baseline debe salir en completas. R0 y R1 deben salir en parciales o fallidas, no en completas. Hotel, en R0 y R1, debe seguir en 503 en las dos réplicas.

## Procedimiento

```powershell
# Estado normal. No activa el fallo.
./chaos/chaos-replicas.ps1 -Action status

# R0 y R1, solo tras el visto bueno de Jarrison (flags y 2 réplicas Sports Ready).
./chaos/chaos-replicas.ps1 -Action enable -DurationSeconds 120 -ConfirmExperiment

# Siempre, también si k6 o la red fallan.
./chaos/chaos-replicas.ps1 -Action disable
```

Secuencia:

1. `status`: 2 pods Ready, `activo=false`, `envDown=false`, habitación 200, `/live` 200.
2. Jarrison confirma Baseline (`RESILIENCE_ENABLED=true`, `HOTEL_FALLBACK_ENABLED=true`) y lanza k6 `ROUND=baseline`.
3. Jarrison pone R0 (`false` / `false`) y confirma las dos réplicas de Sports.
4. `enable` 120 s. Las dos líneas JSON deben traer `temporalActivo=true`, habitación 503 y `/live` 200. Si una falla, el script hace `disable` en todas y no se lanza k6.
5. Jarrison lanza k6 `ROUND=r0` con el mismo perfil.
6. `disable` y anotar la hora. Repetir `status` hasta habitación 200 en los dos pods.
7. Repetir los pasos 4–6 para R1 con flags `true` / `true` y `ROUND=r1`. Misma inyección de 120 s.

## Recuperación

El `disable` del script habla con cada pod. No borra datos ni cambia réplicas.  
Si esta sesión muere después del `enable`, cada proceso cumple su temporizador (120 s) y vuelve a servir 200. Al reconectar, ejecutar igual `disable` y `status`.

`./chaos/revert-chaos.ps1` contra el NLB se niega: ese POST no apaga las dos réplicas.

No poner `CHAOS_DEPENDENCY_DOWN=true` en el ConfigMap. Si `status` muestra `envDown=true`, detenerse; ese modo no caduca.

## Relación con evidencias LOCAL

Experimento A LOCAL (`40-*`, `42-*`): con 503, Hotel falla igual en R0 y R1.  
Esta corrida mide la mitigación de Sports. No inventa disponibilidad de Hotel ni reejecuta el experimento MySQL.
