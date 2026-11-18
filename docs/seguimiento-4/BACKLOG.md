# Backlog del Seguimiento #4

## Cerrado, con evidencia en este repositorio

- [x] Hotel en OKE: dos réplicas, MySQL, NLB y probes
- [x] Trazas W3C de Sports, Hotel y Cine (`93-tempo-4f8140a18fbaa1f98caaa8990d14341c.json`)
- [x] Chaos Toolkit local (`40-chaostoolkit-journal.json`)
- [x] HTTP 503 en las dos réplicas de OCI, cubierto en R0 y en la R1 definitiva (`94-r0-retry-cobertura.txt`, `96-r1-retry-cobertura.txt`)
- [x] Recuperación a habitación 200 y `/live` 200 después del disable
- [x] Fail-fast local (`50-*`) y bulkhead local (`60-*`), separados del resultado E2E
- [x] Informe, resultados y sustentación alineados con Baseline, R0 y R1
- [x] Dashboard `experimento-a-503` publicado en Grafana de OKE por el ConfigMap `grafana-dashboards`. URL local `http://127.0.0.1:3001/d/experimento-a-503`. Capturas `98-grafana-experimento-a-k6.png`, `98-grafana-experimento-a-series.png` y `98-grafana-experimento-a-contador.png`. El uid `seguimiento-4-multicloud` siguió en HTTP 200.
- [x] Chaos gate en el runner, sin OCI. Negativa roja: https://github.com/sgiraldor/hotel-fastify/actions/runs/44189190442. Positiva verde: https://github.com/sgiraldor/hotel-fastify/actions/runs/44189597682. Los artefactos revisados están en `evidencias/chaos-gate/44189190442` y `evidencias/chaos-gate/44189597682`.
- [x] JSON original del baseline: `evidencias/seguimiento-4-local/baseline-hotel503-baseline-20261117-003033.json`, RUN_ID `hotel503-baseline-20261117-003033`. SHA-256 `c4e89fbcb981aecb40505f4a18e98f94695edb080fea933730c9a05f9391756c`. 289/289 completas, 0 parciales, 0 fallidas, p95 312,02064 ms.

## Pendiente de Samuel

1. **Release.** `v1.1.0` queda donde está: apunta a un commit anterior a R0 y R1. Hace falta un tag nuevo y el release creado desde ese tag. Todavía no se crean.

## Pendiente de coordinar

2. **Jarrison.** Evidencia del experimento de latencia intercloud. Código y métrica del circuit breaker. El fallback ya se ve en la traza `68adbcf21b960acf374c54886c56d681`, así que esa parte no se le pide de nuevo como si no existiera.
3. **Daniel.** Evidencia del agotamiento de recursos en Cine y de sus dos patrones. Las series `cine-api` en Prometheus no cubren ese experimento.

## Fuera de este cierre

No repetir el 503 de OCI. No mover `v1.1.0`. El release y el tag nuevo siguen sin crearse. La rama `feat/seguimiento-4-chaos` ya está publicada; `main` no se tocó.
