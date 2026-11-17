# Resultados reales — Seguimiento #4 (Samuel / Hotel)

Actualizado tras ejecución autónoma post-despliegue OCI.

## 1) Chaos Toolkit (LOCAL)

- Entorno: `.venv-chaos` (chaostoolkit 1.21.4)
- Experimento: `chaos/experiment-hotel-dependency.json`
- Resultado: `status=completed`, `deviated=false`
- Flujo verificado: steady 200 → enable → **503** (process probe) → `/live` 200 → disable → steady 200
- Evidencias: `evidencias/seguimiento-4-local/40-chaostoolkit-*`
- **No ejecutado en OKE** (sin ventana de caos cloud)

## 2) Observabilidad (LOCAL)

- Prometheus `:9090` scrape `hotel-api` **up**
- Grafana `:3001` dashboard `hotel-seguimiento-4`
- Snapshot post-inyección (~20s):
  - `hotel_http_p95_ms` ≈ 1.24
  - `hotel_http_throughput_rps` ≈ 0.13 (gauge acumulado desde arranque del proceso)
  - `hotel_chaos_503_total` = 82
  - error rate approx ≈ 12.44% (acumulado del proceso, no solo ventana)
- Evidencias: `41-prometheus-snapshot.json`, `41-metrics-prometheus.txt`
- Trazas Tempo/Jaeger: no levantadas (OTLP off en compose local); correlación vía `x-trace-id` HTTP

## 3) Carga k6 — perfil provisional (LOCAL)

Perfil **idéntico** Baseline/R0/R1: stages 5s→5VU / 25s hold / 5s→0; peak 5 VU; ~35s.

| Round | Mode | Caos | Reqs | RPS | p95 ms | error rate |
|-------|------|------|------|-----|--------|------------|
| Baseline | protected | no | 71158 | 2033.00 | 2.778 | 0.00 |
| R0 | unprotected | sí (40s) | 143395 | 4096.99 | 1.580 | 1.00 |
| R1 | protected | sí (40s) | 140352 | 4010.00 | 1.583 | 1.00 |

Diff R1 vs R0 (mismo fallo):

- error_rate: **0%** de cambio (ambos 100% 503)
- p95: **+0.19%** (1.580 → 1.583 ms)
- rps: **-2.12%**

Interpretación: **no hay mejora inventada**. La indisponibilidad total de Hotel no se mitiga con timeouts/bulkhead del callee; Sports debe implementar CB/retry/fallback.

Evidencias: `42-k6-*`, `scripts/experiments/k6-hotel-profile.js`

## 4) Patrones de resiliencia (LOCAL)

| Modo | poolLimit | queryTimeoutMs | requestTimeoutMs |
|------|-----------|----------------|------------------|
| unprotected | 50 | 30000 | 0 |
| protected | 10 | 2000 | 3000 |

- Unit tests: 4/4 OK (`43-resilience-unit.txt`)
- Métrica que cambia realmente: límites expuestos en `/metrics` (`db.poolLimit`, `db.queryTimeoutMs`) y comportamiento ante DB lenta (`conTimeoutConsulta`)
- Un 503 rápido del interruptor **no** cuenta como éxito de resiliencia E2E

## 5) Kubernetes OCI (solo verificación)

- 2/2 Hotel Ready + MySQL Ready
- Probes `/live` + `/ready`; req 100m/128Mi lim 500m/512Mi
- HTTP público: `http://149.130.165.30` → 200 + `x-trace-id`
- Evidencias: `44-oke-*` (sin cambios de infra, sin caos cloud)

## Pendiente terceros

- **Jarrison (Sports)**: perfil k6 común, CB/timeouts caller, Chaos Gate E2E, integración AWS→OCI
- **Daniel (Cine)**: eslabón GCP y correlación multicloud completa
