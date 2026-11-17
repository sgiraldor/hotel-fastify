# Resultados reales — Seguimiento #4 (Samuel / Hotel)

## Alcance de los experimentos

| Experimento | Obligatoriedad | Ámbito | ¿Reemplaza al A? |
|-------------|----------------|--------|------------------|
| **A** — HTTP 503 total | **Obligatorio** del seguimiento | LOCAL validado; runbook OCI listo (`DEMO_OCI_EXPERIMENTO_A.md`) **sin ejecutar aún** | — |
| **B** — MySQL degradada | Complementario | Solo LOCAL | **No** |
| **C** — Bulkhead alta concurrencia | Complementario | Solo LOCAL | **No** |

B y C demuestran fail-fast/bulkhead del **callee**. **No** sustituyen la indisponibilidad obligatoria (A) ni mitigan el blast radius E2E: eso corresponde a Sports.

---

## A. Experimento obligatorio — indisponibilidad HTTP 503

**Estado:** validado en LOCAL (Chaos Toolkit + k6). **Pendiente E2E con Sports (Jarrison) y demo OCI autorizada.**  
**Evidencias originales conservadas** (no regeneradas ni borradas): `40-chaostoolkit-*`, `42-k6-*`.

### Hallazgo (sin fabricar mejora)

| Round | Mode | Fallo | Reqs | RPS | p95 ms | error rate |
|-------|------|-------|------|-----|--------|------------|
| Baseline | protected | no | 71158 | 2033 | 2.778 | **0%** |
| R0 | unprotected | 503 total | 143395 | 4097 | 1.580 | **100%** |
| R1 | protected | 503 total | 140352 | 4010 | 1.583 | **100%** |

- Diff R1 vs R0: error_rate **0%** de cambio; p95 **+0.19%**.
- **No hubo mejora de tasa de éxito.** El interruptor fuerza 503 en toda la ventana; fail-fast/bulkhead de Hotel no pueden convertir eso en disponibilidad.
- Mitigación E2E: **Sports** (timeout + circuit breaker + respuesta parcial explícita). Ver `CONTRATO_SPORTS_HOTEL.md`.

Chaos Toolkit LOCAL: steady 200 → 503 → `/live` 200 → recovery 200 (`40-chaostoolkit-journal.json`).

---

## B. Prueba complementaria — MySQL degradada (latencia Toxiproxy)

**Ámbito:** solo laboratorio LOCAL, datos sintéticos. **No ejecutada en OCI.**  
**Fallo:** Toxiproxy `latency=2500ms` en el path API→MySQL (sin borrar datos ni saturar de forma descontrolada).

### Hipótesis declarada *antes* de ejecutar

Archivo: `evidencias/seguimiento-4-local/50-hypothesis-mysql-degrade.json`

> Bajo latencia MySQL ~2500ms, R1 (`protected`) activa fail-fast/bulkhead y **acota p95** frente a R0 (`unprotected`), que completa HTTP 200 con p95 alto. **No** se afirma mejora de disponibilidad del experimento A (503 total).

Métrica objetivo primaria: **p95** bajo degradación.  
Secundarias: success/error rate, throughput exitoso, counters fail-fast/bulkhead, recuperación.

### Perfil k6 (idéntico R0/R1)

`LOCAL_MYSQL_DEGRADE_K6_V8_60S`: stages 10s→8 VU / 40s hold / 10s→0.

### Resultados numéricos reales

| Round | Mode | Latencia | Reqs | RPS | p95 ms | success | error | Notas |
|-------|------|----------|------|-----|--------|---------|-------|-------|
| Baseline | protected | 0 | 98437 | 1640.56 | 5.939 | **100%** | 0% | sin toxic |
| R0 | unprotected | 2500ms | 150 | 2.49 | **2578.1** | **100%** | 0% | 150× HTTP 200 |
| R1 | protected | 2500ms | 205 | 3.41 | **2004.4** | **0%** | 100% | 5xx; fail-fast |

Diff R1 vs R0:

| Señal | Valor |
|-------|-------|
| p95 | **-22.25%** (2578 → 2004 ms) |
| success_rate | **-100 pp** (100% → 0%) |
| throughput exitoso | 2.49 rps → **0** rps |
| fail_fast_timeouts (`/metrics`) | **23** |
| bulkhead_rejections | **0** (8 VU ≤ concurrencyLimit 10) |
| recuperación tras quitar toxic | **14 ms**, HTTP 200 |

### Interpretación honesta

- Hipótesis **p95 acotado + fail-fast activado**: **sí** (R1).
- Hipótesis **mejora de tasa de éxito**: **no** (R1 empeora éxito a propósito al cortar espera).
- Un 504/503 rápido **no** se cuenta como disponibilidad recuperada.
- Con pool limitado, parte de los 5xx adicionales reflejan presión de conexiones mientras queries huérfanas siguen hasta MySQL (límite conocido del fail-fast a nivel Promise).
- Bulkhead lógico verificado en unit test; en esta carga no fue el rechazo dominante.

Evidencias: `50-hypothesis-*`, `50-k6-mysql-*`, `50-mysql-degrade.csv`, `50-mysql-degrade-diff.json`, `50-metrics-*`, `50-recovery.json`.

---

## C. Bulkhead bajo alta concurrencia (LOCAL)

**Evidencias nuevas** (A/B intactas): `60-hypothesis-bulkhead.json`, `60-k6-bulkhead-*`, `60-bulkhead.csv`, `60-bulkhead-diff.json`, `60-metrics-*`, `60-inflight-samples-*`, `60-recovery.json`.

### Hipótesis (declarada antes)

Con latencia MySQL 3000ms y 24 VU, R1 (`concurrencyLimit=4` < `pool=10`) produce `bulkhead_rejections>0` y `peak_inflight<=4`; R0 (unprotected) no rechaza por bulkhead. Trade-off: R1 **aísla** la dependencia y **reduce** success_rate. Los 503 no son éxitos.

### Carga

`LOCAL_BULKHEAD_K6_V24_50S` — stages 5s→24 / 40s hold / 5s→0; Toxiproxy 3000ms; mismo perfil R0/R1.

### Resultados

| Round | Mode | conc./pool | Reqs | success | error | p95 total | p95 OK | bulkhead | peak_inflight | OK rps |
|-------|------|------------|------|---------|-------|-----------|--------|----------|---------------|--------|
| R0 | unprotected | 50/50 | 326 | **100%** | 0% | 8994 ms | 8994 ms | **0** | **24** | 6.28 |
| R1 | protected | **4**/10 | 190516 | **0.03%** | 99.97% | **7.9 ms** | 3133 ms | **190454** | **4** | 1.19 |

- Bulkhead activado en R1: sí (`503` + counter).
- `peak_inflight` acotado al límite: sí (4).
- Mejora de disponibilidad/success: **no** (intercambio explícito aislamiento ↔ éxito).
- Recuperación tras desactivar Toxiproxy: **14 ms**, HTTP 200.

---

## Observabilidad LOCAL

Prometheus `:9090` + Grafana `:3001` (dashboard `hotel-seguimiento-4`).  
Métricas: `hotel_db_failfast_timeouts_total`, `hotel_db_bulkhead_rejections_total`, `hotel_db_inflight`, `hotel_db_peak_inflight`, `hotel_db_concurrency_limit`, `hotel_db_pool_limit`.

## OCI (solo verificación, sin caos)

URL: `http://149.130.165.30` — 2 pods Hotel Ready + MySQL Ready + Service NLB.  
HTTP `GET /api/v2/habitacion/1` → 200. Evidencias `28-39`, `44-oke-*`, cierre `70-oke-*`.  
Caos OCI: **preparado, no ejecutado** → `DEMO_OCI_EXPERIMENTO_A.md`.
