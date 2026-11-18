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
| Baseline | `hotel503-baseline-20261117-003033` | 289 | 0 | 0 | 100 % completa | 312,02 ms |
| R0 | `hotel503-r0-retry-20261117-004150` | 0 | 0 | 320 | 0 % | 224,13 ms |
| R1 | `hotel503-r1-retry-20261117-011303` | 0 | 349 | 0 | 100 % degradada | 234,60 ms |

El 100 % de R1 son respuestas parciales con fallback. Hotel siguió en 503 durante toda la carga y no hubo ninguna solicitud completa. El p95 de R1 es 4,7 % mayor que el de R0.

El JSON original del baseline está en `evidencias/seguimiento-4-local/baseline-hotel503-baseline-20261117-003033.json`. Trae 289 solicitudes, 289 completas, 0 parciales, 0 fallidas, disponibilidad 100 % y p95 312,02064 ms. El perfil suma 75 s: 15 s a 2 VU, 45 s a 4 VU y 15 s a 0. La tabla redondea ese p95 a 312,02 ms. Una medición anterior, del `RUN_ID` `hotel-503-prueba-01`, reportó 302 completas y p95 313,39 ms. Esa corrida no es la tabla definitiva. `k6-baseline-summary.json` tampoco lo es: tiene 71158 peticiones de un perfil local distinto.

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

OCI: Tempo y Prometheus en el namespace `observability`. El dashboard `experimento-a-503` está publicado por el ConfigMap `grafana-dashboards`. La URL local es `http://127.0.0.1:3001/d/experimento-a-503`, ventana 00:40 a 01:20 -05. Las 289/289, 320/320 y 349/349, y los p95, están marcados como archivo de k6. `hotel_chaos_active` y `hotel_chaos_503_total` salen de Prometheus. Tempo respondió 200 para la traza `68adbcf21b960acf374c54886c56d681` a través de Grafana. Capturas: `98-grafana-experimento-a-k6.png`, `98-grafana-experimento-a-series.png` y `98-grafana-experimento-a-contador.png`. El dashboard `seguimiento-4-multicloud` siguió en HTTP 200.

## Matriz verificada en este repositorio

| Integrante | Fallo | Métrica verificada aquí | Patrón verificado aquí |
|---|---|---|---|
| Samuel | HTTP 503 de Hotel en OCI | Cobertura del 503, p95 y clasificación de k6 en `94-*` y `96-*` | Fail-fast y bulkhead, solo en los experimentos locales B y C |
| Jarrison | Latencia intercloud de 800 ms, no el 503 de Hotel | JSON original: Baseline 273 completas y p95 360,13 ms; R0 113 completas y p95 1230,35 ms; R1 273 parciales, 0 completas y p95 624,50 ms. Reducción de p95 49,24 %. ZIP `evidencias-intercloud-aws-intercloud-live-20261117191113-20261117-194416.zip` | Timeout de 400 ms y `hotel_via=fallback` en R1. No hay evidencia directa de una transición del circuit breaker |
| Daniel | Saturación de concurrencia en Cine GCP, una réplica | Serie 75 s: Baseline 264/264, p95 481,74 ms; R0 186/186, p95 715,09 ms; R1 186/186, p95 696,51 ms. Serie distinta GKE v2: 78,33 / 29,97 / 27,87 RPS exitosos | Bulkhead: 108 HTTP 503 `bulkhead_timeout` de 200. Admission: 9 HTTP 503 `inflight_limit` de 80. Ninguna de las dos series demuestra mejora causal de R1 |

La serie multicloud de 75 s no es la serie k6 directa de GKE v2. Las sondas de patrones no son ninguna de esas rondas.

## Saturación de Cine

Este bloque no es el HTTP 503 de Hotel ni la latencia intercloud de Sports. Las copias están en `evidencias/seguimiento-4-cine/`. El release `v5.1.0` apunta a `d9c41a3fbc68b77223495d3ecb602229a3345e03`. El Chaos Gate [44207033513](https://github.com/Danielg2004/cine_dvps/actions/runs/44207033513) terminó en éxito sobre `main` `b79ef990ebcf2492f95f86d0f832a3448e017a3c`. Ese workflow evalúa los JSON del repositorio. No inyecta el fallo en GKE.

El fallo publicado es retención de concurrencia: `holdMs=250`, `maxInflight=8`, `maxQueueWaitMs=200`, `durationSec=90`, una réplica. No es agotamiento de CPU ni de memoria.

### Serie multicloud de 75 s

Sports ejecutó el flujo. Cine registró la saturación en Cloud Logging.

| Ronda | RUN_ID | Resultado | p95 | Tasa |
|---|---|---|---:|---:|
| Baseline | `cine-baseline-20261117-164725` | 264/264 | 481,74 ms | 3,50/s |
| R0 | `cine-r0-20261117-170417` | 186/186 | 715,09 ms | 2,46/s |
| R1 | `cine-r1-20261117-171742` | 186/186 | 696,51 ms | 2,47/s |

R0 y R1 tienen 0 HTTP 429 y 0 HTTP 503. `appliedCount` es 186 en ambas. La reducción de p95 es 18,58 ms, 2,6 %. El propio cierre dice que esa diferencia no prueba bulkhead ni admission: con 4 VU el techo plausible queda por debajo de 8 cupos, y el pico de concurrencia no se midió. El archivo no trae la ventana UTC del baseline. La saturación de R0 va de `2026-11-17T22:05:49.671Z` a `22:07:19.673Z`, y la de R1 de `22:17:46.975Z` a `22:19:16.977Z`. Las dos pararon por timeout de 90 s.

### Serie GKE v2

k6 directo a `GET /api/v2/peliculas/1`, 80 llegadas por segundo durante 30 s, una réplica. Es otra carga.

| Ronda | RPS exitosos | p95 de éxitos | HTTP 503 |
|---|---:|---:|---:|
| Baseline | 78,33 | 872,05 ms | 0 |
| R0 | 29,97 | 860,65 ms | 1460 |
| R1 | 27,87 | 988,80 ms | 1504 |

R1 queda 7,0 % por debajo de R0. `offered_load_comparable` es true. `finished_at`: baseline `2026-11-17T01:56:06.009Z`, R0 `01:57:24.629Z`, R1 `01:58:52.798Z`. Los 503 de esta serie no traen el motivo por patrón.

### Patrones, en sondas aparte

Bulkhead: 200 solicitudes, 108 HTTP 503 con `bulkhead_timeout` y 92 HTTP 200. Admission: 80 solicitudes entre `2026-11-17T22:38:25.637Z` y `22:39:22.254Z`, 9 HTTP 503 con `inflight_limit`, 66 HTTP 200 y 5 errores de cliente. Esa sonda usó admisión 2, bulkhead 8 y otra saturación (`holdMs=1000`, `maxInflight=2`). No es la serie de 75 s ni la GKE v2.

### Declarativo

`chaos/experiments/cine-resource-exhaustion.json` es un experimento de Chaos Toolkit: steady state, arranque y rollback. No hay journal de `chaos run`. Los valores por defecto son 200 ms, 4 cupos y 30 s, sin `maxQueueWaitMs`. `experiment.yaml` deja los umbrales en `PENDING_MEASUREMENT`. El estado es **parcial**.

### Observabilidad leída el 2026-11-18

Prometheus todavía tenía `otel_cine_experiment_saturation_active`. En R0 valía 1 a las 22:06:30Z y a las 22:07:19Z, con `experiment_round=r0`. En R1 la serie aparece en 1 desde 22:18:40Z hasta 22:19:25Z y pasa a 0 a las 22:19:40Z. No hay muestra de esa serie entre el inicio registrado, 22:17:46Z, y 22:18:40Z. El gauge de inflight no mostró un pico: el scrape puede perder una retención de 250 ms. El `increase` del contador no reproduce los 186 de k6, así que no sustituye esa cifra.

Tempo, con límite 20, devolvió trazas del flujo en ambas ventanas. La muestra `bda652d597e4cf8a087c9e45acb0746` y la `6867dce73e10d5f662f862685b2e520` tienen Sports, Hotel y Cine en HTTP 200. Son muestras, no las 186 solicitudes.

### Recuperación

`gke-admission-probe-recovery.json`: `2026-11-17T22:40:56.610Z`, saturación apagada, 2/2 Ready, ronda `baseline`, resiliencia apagada, healthz, readyz y película en 200, SQL `up`, flujo de Sports en 200. A esa hora el gauge de R1 también estaba en 0. `gke-v2-final-state.txt` muestra el Deployment 2/2 y el ConfigMap en baseline. La nota de la serie de 75 s describe el mismo estado restaurado, sin otro timestamp.

## Latencia intercloud de Sports

Este bloque no es el HTTP 503 de Hotel. El paquete original está en `evidencias/seguimiento-4-intercloud/evidencias-intercloud-aws-intercloud-live-20261117191113-20261117-194416.zip`. SHA-256 `f7d2479fec03a9898120c0f66ec56afd2e25cb3cacd67d45b8e5046eab96b84a`. El manifiesto trae 29 archivos y los 29 hashes coincidieron. No había credenciales.

RUN_ID `aws-intercloud-live-20261117191113`. Perfil de 75 s. Los JSON están en `evidencias/seguimiento-4-intercloud/paquete/load/results/`.

| Ronda | Resultado | p95 del JSON | Configuración leída |
|---|---|---:|---|
| Baseline | 273/273 completas, 0 parciales, 0 fallidas | 360,13458 ms | Resiliencia encendida, fallo no armado |
| R0 | 113/113 completas, 0 parciales, 0 fallidas | 1230,3478 ms | Resiliencia y fallback apagados. 800 ms en las dos réplicas |
| R1 | 0 completas, 273/273 parciales, 0 fallidas | 624,49512 ms | Resiliencia y fallback encendidos. Timeout 400 ms. 800 ms en las dos réplicas nuevas |

La tabla redondea esos p95 a 360,13 ms, 1230,35 ms y 624,50 ms. La reducción `(1230,3478 − 624,49512) / 1230,3478` es 49,24 %. `comparison.json` trae `p95DeltaPct` −49,24 y dice que el parcial no es una completa. El 100 % de R1 es disponibilidad degradada.

Las activaciones del paquete coinciden con los POST de Tempo ya archivados en el commit `3c2b1e0`: R0 a las 00:15:02.758Z y 00:15:02.877Z; R1 a las 00:17:31.683Z y 00:17:31.809Z. La traza `3617b94d09302cf5574dccd00b3e48aa` es `r0-1-4`, espera 802 ms y luego Hotel responde 200. La traza `12f64a93a8ea7bccc0047efbe43cc91` es `r1-1-17`, `hotel_via=fallback`, sin span HTTP hacia Hotel, y Cine empieza unos 400 ms después. El desarme quedó en 00:16:24.108Z y 00:18:51.219Z, con `enabled=false` y `latencyMs=0`. La restauración está en 00:20:05.146Z, `reason=success`.

`NOTAS-AUDITORIA.txt` dice que no hay timestamps absolutos de inicio y fin de k6. `generatedAt` es solo una cota. Prometheus no tiene una serie de circuit breaker. La hipótesis del paquete nombra ese patrón, pero ninguna traza ni métrica muestra su transición.
