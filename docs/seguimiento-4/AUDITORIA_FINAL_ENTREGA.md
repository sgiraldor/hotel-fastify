# Auditoría final de la entrega — Seguimiento #4

Fecha de la auditoría: 2026-11-18. Rama `feat/seguimiento-4-chaos`. HEAD al empezar: `c72aacc49b0cf49de28884d4cf4c8b68e7b9e392`.

La guía original del profesor no está en este repositorio. No hay PDF ni documento de rúbrica versionado. La matriz siguiente usa los requisitos de la entrega del 18 de noviembre de 2026 y las evidencias que sí están en el repo. No sustituye una comparación línea por línea con un enunciado que no pudimos abrir.

`main` sigue en `35330ce009dffe7cfd13a0825df5d28e6dd1716a`. El tag `v1.1.0` sigue en `b66c2f5bdf2d5174903c4351ee5b720db389e521` y es ancestro de esta rama. No hay conflictos. El único archivo fuera de Git al empezar era el preflight de Hotel, ya revisado y sin credenciales.

## Validaciones de esta pasada

| Comprobación | Resultado |
|---|---|
| `npm test` | 13 archivos, 76 pruebas, todas pasaron |
| `npx tsc --noEmit` | Salió en 0, sin errores |
| JSON de experimentos, baseline 503, journal de Cine y dashboard | Parsean |
| `kubectl apply --dry-run=client` de Deployment, Service y ConfigMap de Hotel | Los tres quedaron `unchanged`. No se aplicó nada |
| Grafana en `127.0.0.1:3001/api/health` | HTTP 200. El texto del panel en vivo no se volvió a leer |
| Informe de Hotel | 1166 palabras y 74 líneas. No se reexportó a PDF |

## Matriz

| Requisito | Estado | Evidencia |
|---|---|---|
| Tres APIs, tres nubes y Kubernetes | CUMPLE | `docs/seguimiento-4/README.md`, `docs/seguimiento-4/FLUJO_MULTICLOUD.md` |
| Flujo Sports → Hotel → Cine | CUMPLE | Traza sana `evidencias/seguimiento-4-local/93-tempo-4f8140a18fbaa1f98caaa8990d14341c.json`. Hotel no llama a Cine |
| Trace ID extremo a extremo | CUMPLE | La misma traza y `docs/seguimiento-4/FLUJO_MULTICLOUD.md` |
| Tres fallos distintos | CUMPLE | 503 de Hotel, latencia de Sports, saturación de Cine. Carpetas `evidencias/seguimiento-4-local/`, `evidencias/seguimiento-4-intercloud/` y `evidencias/seguimiento-4-cine/` |
| Experimento declarativo de Hotel versionado | CUMPLE | Local: `chaos/experiment-hotel-dependency.json`. OCI dos réplicas: `chaos/experiment-hotel-oci-replicas.json` |
| Ese experimento preparado para las dos réplicas de OCI | CUMPLE como artefacto | Chaos Toolkit orquesta `replicas-toolkit.ps1` → `chaos-replicas.ps1`. Validado con `chaos validate` y dry-run. La ejecución real en OCI aún no se autorizó ni se corrió |
| Ese experimento ejecutado de verdad contra las dos réplicas de OCI | NO CUMPLE todavía | Pendiente de autorización. El journal histórico `40-chaostoolkit-journal.json` sigue siendo local de un solo proceso. R0/R1 usaron el script directo |
| Chaos Toolkit real en el runner | CUMPLE | Corridas 44189190442 y 44189597682. Artefactos en `evidencias/chaos-gate/` |
| Interruptor propio | CUMPLE | `src/plugins/chaos-dependency.plugin.ts`, ruta `GET/POST /api/v2/chaos/dependency` |
| Estado estable, hipótesis, métrica, blast radius y rollback del archivo declarativo | CUMPLE | `chaos/experiment-hotel-oci-replicas.json` + `chaos/README.md`. Steady-state y recovery por pod, no por NLB |
| Aborto explícito dentro del JSON de Chaos Toolkit | PARCIAL | No hay bloque `controls`. Enable exige `CHAOS_OCI_CONFIRM=YES` y `-ConfirmExperiment`. Si una réplica falla al encender, `Disable-All` apaga las dos. TTL máximo 300 s. Rollback con `--rollback-strategy always` |
| Rollback de las dos réplicas | CUMPLE | Method `disable`, rollbacks del JSON y `finally` del wrapper llaman `chaos-replicas.ps1 -Action disable` |
| Dos patrones de Hotel implementados y medidos | CUMPLE en local | Fail-fast `50-*` y bulkhead `60-*`. No explican el parcial de R1 |
| Patrón que explica R1 del 503 | PARCIAL | El fallback de Sports se ve en `96-tempo-68adbcf21b960acf374c54886c56d681.json`. El circuit breaker no tiene métrica |
| Baseline, R0 y R1 de Hotel con k6 original | CUMPLE | Baseline JSON `baseline-hotel503-baseline-20261117-003033.json`. R0 `94-r0-retry-cobertura.txt`. R1 definitiva `96-r1-retry-cobertura.txt`. La primera R1 está en `95-r1-cobertura.txt` y no entra |
| Sports: 273 / 113 / 273 y p95 360,13 / 1230,35 / 624,50 | CUMPLE como archivo | ZIP y JSON en `evidencias/seguimiento-4-intercloud/`. Reducción 49,24 %. No atribuirla solo al circuit breaker |
| Cine 75 s: 264 / 186 / 186 | CUMPLE como archivo | `evidencias/seguimiento-4-cine/MULTICLOUD_75S_SERIES.md`. La baja de 2,6 % no prueba los patrones |
| Cine GKE v2: 78,33 / 29,97 / 27,87 RPS | CUMPLE como otra serie | `baseline-k6-gke-v2.json`, `r0-k6-gke-v2.json`, `r1-k6-gke-v2.json` |
| Sondas de bulkhead y admission | CUMPLE | `gke-v2-reject-probe.json` (108/200) y `gke-admission-reject-probe.json` (9/80). No son las rondas de carga |
| Journal real de Chaos Toolkit de Cine | CUMPLE con límite | `chaos-toolkit-journal.json`: `dry=null`, `completed`, start 202, `active=true`, rollback 200, `active=false`. `appliedCount=0` al activar. No es la prueba de carga |
| OpenTelemetry, Prometheus, Tempo y Grafana | CUMPLE como evidencia archivada | Dashboard versionado `observability/grafana-dashboard-experimento-a.json`. Capturas `98-grafana-experimento-a-*.png`. Trazas en `93-*` y `96-*` |
| Panel en vivo de Grafana idéntico al archivo | NO VERIFICADO en esta pasada | `/api/health` respondió 200. El texto del dashboard no se releyó y el ConfigMap no se volvió a aplicar |
| Chaos gate negativo y positivo | CUMPLE | Roja 44189190442 y verde 44189597682, con rollback y `compose_down=0` |
| README, resultados, sustentación e informe | CUMPLE | `docs/seguimiento-4/README.md`, `RESULTADOS_EXPERIMENTOS.md`, `SUSTENTACION.md`, `INFORME_SAMUEL_6P.md` |
| Tag nuevo y release de la entrega | NO CUMPLE | Sigue pendiente a propósito. `v1.1.0` no se mueve |

## Resultados que quedan cerrados

Hotel: baseline 289 completas, p95 312,02 ms. R0: 320 fallidas, 0 %, p95 224,13 ms. R1 definitiva: 349 parciales, disponibilidad degradada 100 %, p95 234,60 ms. Cero completas en esa R1.

Sports: 273 completas y 360,13 ms; 113 completas y 1230,35 ms; 273 parciales y 624,50 ms. La reducción de p95 es 49,24 %. El parcial no es una respuesta completa.

Cine, serie de 75 s: 264, 186 y 186 completas, con p95 481,74, 715,09 y 696,51 ms. La baja de 2,6 % no demuestra los patrones. GKE v2 es otra serie: 78,33, 29,97 y 27,87 RPS exitosos. R1 queda por debajo de R0.

## Bloqueos antes de la clase

1. Crear un tag nuevo, distinto de `v1.1.0`, y el release desde ese tag. Todavía no se crean.
2. Autorizar y ejecutar una sola vez `run-oci-replicas-experiment.ps1 -RealRun -ConfirmExperiment` si el profesor pide inyección declarativa en vivo. Hasta entonces, dry-run o evidencias históricas. No uses `chaos run` contra el NLB para afirmar las dos réplicas.
3. No decir que el journal corto de Cine saturó tráfico. `appliedCount=0` en la activación.
4. No decir que el circuit breaker de Sports quedó medido.

## Grafana

Los archivos versionados ya citan el JSON del baseline 503. Están en `observability/grafana-dashboard-experimento-a.json` y en `k8s/observability/grafana-dashboards.yaml`. Esta auditoría no aplicó el ConfigMap. Si el panel en vivo conserva la frase antigua, hace falta un apply posterior, fuera de esta pasada.

URLs de demostración, con el port-forward ya documentado:

- `http://127.0.0.1:3001/d/seguimiento-4-multicloud`
- `http://127.0.0.1:3001/d/experimento-a-503`

El comando de acceso es `kubectl -n observability port-forward svc/grafana 3001:3000`.
