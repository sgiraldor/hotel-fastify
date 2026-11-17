# Resultados reales — Seguimiento #4 (Samuel / Hotel)

## A. Experimento obligatorio — indisponibilidad HTTP 503

**Estado:** validado en LOCAL (Chaos Toolkit + k6). **Pendiente E2E con Sports (Jarrison).**  
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

## Observabilidad LOCAL

Prometheus `:9090` + Grafana `:3001` (dashboard `hotel-seguimiento-4`).  
Métricas nuevas: `hotel_db_failfast_timeouts_total`, `hotel_db_bulkhead_rejections_total`, `hotel_db_inflight`, `hotel_db_pool_limit`.

## OCI (solo verificación, sin caos)

URL: `http://149.130.165.30` — 2 pods Ready. Evidencias `28-39`, `44-oke-*`.
