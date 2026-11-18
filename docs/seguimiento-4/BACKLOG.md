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
- [x] JSON original del baseline del HTTP 503: `evidencias/seguimiento-4-local/baseline-hotel503-baseline-20261117-003033.json`, RUN_ID `hotel503-baseline-20261117-003033`. SHA-256 `c4e89fbcb981aecb40505f4a18e98f94695edb080fea933730c9a05f9391756c`. 289/289 completas, 0 parciales, 0 fallidas, p95 312,02064 ms.
- [x] Paquete original de la latencia intercloud de Sports, RUN_ID `aws-intercloud-live-20261117191113`. ZIP SHA-256 `f7d2479fec03a9898120c0f66ec56afd2e25cb3cacd67d45b8e5046eab96b84a`. Los 29 archivos del manifiesto coinciden. No es el experimento 503.
- [x] Evidencias de Cine del release `v5.1.0`, commit `d9c41a3fbc68b77223495d3ecb602229a3345e03`, y del Chaos Gate en `main` `b79ef990ebcf2492f95f86d0f832a3448e017a3c`. Copias en `evidencias/seguimiento-4-cine/`.

## Pendiente de Samuel

1. **Release.** `v1.1.0` queda donde está: apunta a un commit anterior a R0 y R1. Hace falta un tag nuevo y el release creado desde ese tag. Todavía no se crean.

## Pendiente de coordinar

2. **Jarrison.** El paquete ya está archivado. Sigue sin timestamps absolutos de inicio y fin de k6, como dice su propia nota, y sin una métrica o span que pruebe la transición del circuit breaker.
3. **Daniel.** Falta el journal de `chaos run` con la intensidad publicada (hold 250 ms, 8 cupos, cola 200 ms, 90 s). El JSON declarativo usa otros valores por defecto y `experiment.yaml` sigue en `PENDING_MEASUREMENT`. La serie de 75 s no midió el pico de cupos.

## Fuera de este cierre

No repetir el 503 de OCI. No mover `v1.1.0`. El release y el tag nuevo siguen sin crearse. La rama `feat/seguimiento-4-chaos` ya está publicada; `main` no se tocó.
