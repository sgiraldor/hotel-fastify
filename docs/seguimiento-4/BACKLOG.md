# Backlog del Seguimiento #4

## Cerrado, con evidencia en este repositorio

- [x] Hotel en OKE: dos réplicas, MySQL, NLB y probes
- [x] Trazas W3C de Sports, Hotel y Cine (`93-tempo-4f8140a18fbaa1f98caaa8990d14341c.json`)
- [x] Chaos Toolkit local (`40-chaostoolkit-journal.json`)
- [x] HTTP 503 en las dos réplicas de OCI, cubierto en R0 y en la R1 definitiva (`94-r0-retry-cobertura.txt`, `96-r1-retry-cobertura.txt`)
- [x] Recuperación a habitación 200 y `/live` 200 después del disable
- [x] Fail-fast local (`50-*`) y bulkhead local (`60-*`), separados del resultado E2E
- [x] Informe, resultados y sustentación alineados con Baseline, R0 y R1

## Pendiente de Samuel

1. **Chaos gate real.** `.github/workflows/chaos-hotel-manual.yml` corre tests y deja la inyección remota deshabilitada. Falta una ejecución que lance el experimento declarativo, evalúe la métrica y falle el job si el umbral no se cumple, con reversión en el mismo job.
2. **Dashboard de la ventana de inyección.** Grafana está en OKE y hay JSON local de paneles. Falta la vista que muestre a la vez el intervalo del 503 y la métrica de parciales o fallidas, más la captura para la entrega.
3. **Baseline archivado.** La comparación usa 289 completas, disponibilidad 100 % y p95 312,02 ms. El JSON de k6 no está en `load/results/` ni en `evidencias/`.
4. **Release.** `v1.1.0` queda donde está: apunta a un commit anterior a R0 y R1. Hace falta un tag nuevo y el release creado desde ese tag. Todavía no se crean.

## Pendiente de coordinar

5. **Jarrison.** Evidencia del experimento de latencia intercloud. Código y métrica del circuit breaker. El fallback ya se ve en la traza `68adbcf21b960acf374c54886c56d681`, así que esa parte no se le pide de nuevo como si no existiera.
6. **Daniel.** Evidencia del agotamiento de recursos en Cine y de sus dos patrones. Las series `cine-api` en Prometheus no cubren ese experimento.

## Fuera de este cierre

No repetir el 503. No mover `v1.1.0`. No hacer push ni crear el release hasta cerrar el tag nuevo.
