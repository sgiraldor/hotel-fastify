# Resultados reales — Seguimiento #4 (Samuel / Hotel)

## Alcance

| Experimento | Obligatoriedad | Ámbito | Qué demuestra |
|---|---|---|---|
| **A — HTTP 503** | Obligatorio | OCI, flujo Sports → Hotel → Cine | Indisponibilidad sostenida en las dos réplicas. La mejora de R1 es de Sports |
| **A local** | Preparación | Solo local, contra Hotel | El callee no convierte un 503 total en éxito |
| **B — MySQL lenta** | Complementario | Solo local | Fail-fast. No explica R1 |
| **C — Bulkhead** | Complementario | Solo local | Aislamiento. No explica R1 |

La comparación definitiva es Baseline, R0 y la segunda R1. La primera R1 está en `evidencias/seguimiento-4-local/95-r1-cobertura.txt` y no entra en la tabla.

---

## A. Indisponibilidad HTTP 503 en OCI

**Estado:** ejecutado y cubierto en las dos réplicas. No se repite.

Perfil: `load/k6/flujo-profile-shared.js`. Hotel normal en el baseline. En R0 y R1 el 503 se activó dentro de cada pod con `chaos/chaos-replicas.ps1`, 120 s nuevos por ronda. Los flags `RESILIENCE_ENABLED` y `HOTEL_FALLBACK_ENABLED` los controla Sports. `RESILIENCE_MODE` de Hotel no es ese interruptor.

| Ronda | RUN_ID | Completas | Parciales | Fallidas | Disponibilidad | p95 |
|---|---|---:|---:|---:|---|---:|
| Baseline | medición definitiva del grupo | 289 | 0 | 0 | 100 % completa | 312,02 ms |
| R0 | `hotel503-r0-retry-20261117-004150` | 0 | 0 | 320 | 0 % | 224,13 ms |
| R1 | `hotel503-r1-retry-20261117-011303` | 0 | 349 | 0 | 100 % degradada | 234,60 ms |

El 100 % de R1 son respuestas parciales con fallback. Hotel siguió en 503 durante toda la carga y no hubo ninguna solicitud completa. El p95 de R1 es 4,7 % mayor que el de R0.

El JSON de k6 del baseline no está en el repositorio. Una medición anterior, del `RUN_ID` `hotel-503-prueba-01`, reportó 302 completas y p95 313,39 ms. Esa corrida no es la tabla definitiva.

### Cobertura y trazas

R0: `evidencias/seguimiento-4-local/94-r0-retry-cobertura.txt`. Enable anterior a k6 y disable posterior en `glg2z` y `tmqlg`. Los 503 del run suman 320 y tienen `source=temporal`. Al cerrar, habitación 200 y `/live` 200.

R1: `evidencias/seguimiento-4-local/96-r1-retry-cobertura.txt`. El TTL seguía vigente al terminar k6. El disable fue manual y posterior al fin. Cero HTTP 200 del `RUN_ID` durante la carga. Hotel recibió 18 llamadas, todas 503. Recuperación: `activo=false`, habitación 200, `/live` 200, inyecciones 420 y 202.

Traza de un parcial: `evidencias/seguimiento-4-local/96-tempo-68adbcf21b960acf374c54886c56d681.json`. Sports HTTP 200, `flujo.status=partial`, `degraded=hotel`, Hotel SERVER 503, Cine SERVER 200. La traza sana de las tres APIs está en `93-tempo-4f8140a18fbaa1f98caaa8990d14341c.json`.

El hueco entre 349 solicitudes y 18 llegadas a Hotel es compatible con un circuit breaker de Sports. Aquí no hay gauge de ese breaker, así que no se da por medido.

### Primera R1, descartada

`95-r1-cobertura.txt`: 341 solicitudes, 13 completas, 328 parciales, p95 264,62 ms. El TTL venció unos 14 a 16 s antes del fin de k6 y esas 13 completas coinciden con HTTP 200 reales de Hotel. La traza `95-tempo-e353aafb562d66acca2f12fe830c903e.json` muestra `flujo.status=success` después del TTL. No se compara con R0.

---

## A local. El callee, sin Sports

Validado con Chaos Toolkit y k6 contra Hotel local. Evidencias `40-chaostoolkit-*` y `42-k6-*`. No reemplaza la tabla OCI.

| Round | Mode | Fallo | Reqs | RPS | p95 ms | error rate |
|---|---|---|---:|---:|---:|---|
| Baseline | protected | no | 71158 | 2033 | 2,778 | 0 % |
| R0 | unprotected | 503 total | 143395 | 4097 | 1,580 | 100 % |
| R1 | protected | 503 total | 140352 | 4010 | 1,583 | 100 % |

R1 no mejora el éxito frente a R0. Fail-fast y bulkhead no pueden fabricar una habitación cuando el interruptor responde 503 en toda la ventana. El journal local (`40-chaostoolkit-journal.json`) pasa de 200 a 503, deja `/live` en 200 y vuelve a 200 al desactivar.

---

## B. MySQL degradada (solo local)

**No ejecutada en OCI.** Toxiproxy `latency=2500ms` en el camino API → MySQL. No borra datos.

Hipótesis, declarada en `evidencias/seguimiento-4-local/50-hypothesis-mysql-degrade.json` antes de ejecutar: con MySQL a unos 2500 ms, R1 (`protected`) acota el p95 frente a R0. No se afirma mejora de disponibilidad del experimento A.

Perfil `LOCAL_MYSQL_DEGRADE_K6_V8_60S`: 10 s → 8 VU, 40 s de meseta, 10 s → 0.

| Round | Mode | Latencia | Reqs | RPS | p95 ms | success | error |
|---|---|---|---:|---:|---:|---|---|
| Baseline | protected | 0 | 98437 | 1640,56 | 5,939 | 100 % | 0 % |
| R0 | unprotected | 2500 ms | 150 | 2,49 | 2578,1 | 100 % | 0 % |
| R1 | protected | 2500 ms | 205 | 3,41 | 2004,4 | 0 % | 100 % |

El p95 baja 22,25 % (2578,1 → 2004,4 ms). El éxito baja de 100 % a 0 %. `fail_fast_timeouts` llegó a 23 y `bulkhead_rejections` quedó en 0, porque 8 VU no superan el límite de 10. La recuperación tras quitar el toxic fue de 14 ms, con HTTP 200. Un 504 rápido no es disponibilidad recuperada.

Evidencias: `50-hypothesis-*`, `50-k6-mysql-*`, `50-mysql-degrade.csv`, `50-mysql-degrade-diff.json`, `50-metrics-*`, `50-recovery.json`.

---

## C. Bulkhead bajo alta concurrencia (solo local)

Hipótesis en `60-hypothesis-bulkhead.json`: con MySQL a 3000 ms y 24 VU, R1 (`concurrencyLimit=4`, pool 10) produce rechazos y `peak_inflight` de 4. R0 no rechaza por bulkhead. R1 aísla la dependencia y baja el éxito. Los 503 no son éxitos.

Perfil `LOCAL_BULKHEAD_K6_V24_50S`: 5 s → 24 VU, 40 s de meseta, 5 s → 0.

| Round | Mode | conc./pool | Reqs | success | error | p95 total | p95 OK | bulkhead | peak_inflight | OK rps |
|---|---|---|---:|---|---|---:|---:|---:|---:|---:|
| R0 | unprotected | 50/50 | 326 | 100 % | 0 % | 8994 ms | 8994 ms | 0 | 24 | 6,28 |
| R1 | protected | 4/10 | 190516 | 0,03 % | 99,97 % | 7,9 ms | 3133 ms | 190454 | 4 | 1,19 |

El bulkhead sí se activó. El éxito no mejora. La recuperación tras quitar Toxiproxy fue de 14 ms, con HTTP 200.

Evidencias: `60-hypothesis-bulkhead.json`, `60-k6-bulkhead-*`, `60-bulkhead.csv`, `60-bulkhead-diff.json`, `60-metrics-*`, `60-inflight-samples-*`, `60-recovery.json`.

---

## Observabilidad

Local: Prometheus `:9090` y Grafana `:3001`, dashboard `hotel-seguimiento-4`. Métricas de activación: `hotel_db_failfast_timeouts_total`, `hotel_db_bulkhead_rejections_total`, `hotel_db_inflight`, `hotel_db_peak_inflight`.

OCI: Tempo y Prometheus en el namespace `observability`. `93-prom-summary.txt` lista `cine-api`, `hotel-api` y `sports-api`. Falta un dashboard que muestre, en la misma vista, la ventana del 503 y la tasa de parciales del flujo. No hay captura de esa vista en el repositorio.

## Matriz verificada en este repositorio

| Integrante | Fallo | Métrica verificada aquí | Patrón verificado aquí |
|---|---|---|---|
| Samuel | HTTP 503 de Hotel en OCI | Cobertura del 503, p95 y clasificación de k6 en `94-*` y `96-*` | Fail-fast y bulkhead, solo en los experimentos locales B y C |
| Jarrison | Latencia intercloud | No hay resultado de ese fallo en este repo | El fallback se observa en la traza `68adbcf2…`. El circuit breaker no tiene métrica aquí |
| Daniel | Agotamiento de recursos en Cine | No hay resultado de ese fallo en este repo | No hay patrón de Cine medido en este repo |

La telemetría de `cine-api` en Prometheus demuestra que el servicio exporta series. No demuestra el experimento de agotamiento.
