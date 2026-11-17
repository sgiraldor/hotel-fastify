# Seguimiento #4 — Hotel API (Samuel)

## Arquitectura del grupo

```text
Cliente/k6 -> Sports (AWS) -> Hotel (OCI) -> Sports -> Cine (GCP) -> Sports -> Cliente
```

| Persona | API | Cloud | Fallo asignado | Verificado en este repo |
|---|---|---|---|---|
| Jarrison | Sports (coordinador) | AWS/K8s | Latencia intercloud | No. Sí está el efecto del fallback en la traza `68adbcf2…` |
| Samuel | Hotel | OCI/K8s | HTTP 503 | Sí. R0 y R1 definitiva, evidencias `94-*` y `96-*` |
| Daniel | Cine | GCP/K8s | Agotamiento de recursos | No. Hay series de `cine-api` en Prometheus, no el experimento |

Hotel no es coordinador y no llama a Cine. La métrica de Samuel en el flujo es la cobertura del 503, más la clasificación de k6. Sus patrones son fail-fast y bulkhead, medidos en local. El fallback y el circuit breaker son de Sports: el primero se ve en Tempo y el segundo no tiene métrica en este repositorio.

Comparación definitiva, mismo perfil k6. La primera R1 se descartó y no entra aquí.

| Ronda | Resultado | p95 |
|---|---|---|
| Baseline | 289 completas, disponibilidad 100 % | 312,02 ms |
| R0 | 320 fallidas, disponibilidad 0 % | 224,13 ms |
| R1 | 349 parciales, 0 fallidas, disponibilidad degradada 100 % | 234,60 ms |

El 100 % de R1 no significa que Hotel se haya recuperado. Las dos réplicas siguieron en 503 durante toda la carga.

## Rol de Hotel en OCI

- CRUD legacy + contrato `GET /api/v2/habitacion/:id` para Sports.
- Trazabilidad `x-trace-id` + OpenTelemetry.
- Despliegue en OKE con dos réplicas, MySQL y NLB. Los manifiestos están en `k8s/`.
- Interruptor propio + experimento Chaos Toolkit.
- Fail-fast + bulkhead (`RESILIENCE_MODE`).

## Índice

- [RESULTADOS_EXPERIMENTOS.md](./RESULTADOS_EXPERIMENTOS.md) — A (obligatorio) + B/C (complementarios)
- [SUSTENTACION.md](./SUSTENTACION.md) — guía breve de demo + limitaciones reales
- [GUIA_INTEGRACION_JARRISON.md](./GUIA_INTEGRACION_JARRISON.md) — integración inmediata Sports→Hotel
- [CONTRATO_SPORTS_HOTEL.md](./CONTRATO_SPORTS_HOTEL.md) — contrato técnico completo
- [FLUJO_MULTICLOUD.md](./FLUJO_MULTICLOUD.md) — HTTP E2E real vs OTel E2E
- [DEMO_OCI_EXPERIMENTO_A.md](./DEMO_OCI_EXPERIMENTO_A.md) — cómo se inyectó el 503 en las dos réplicas
- [RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md](./RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md) — procedimiento ya usado en Baseline, R0 y R1
- [CONTRATOS_MULTICLOUD.md](./CONTRATOS_MULTICLOUD.md)
- [OBSERVABILIDAD_COMPARTIDA.md](./OBSERVABILIDAD_COMPARTIDA.md)
- [grafana-dashboard-experimento-a.json](../../observability/grafana-dashboard-experimento-a.json) — comparación de Baseline, R0 y R1; no está cargado en Grafana de OKE
- [EXPERIMENTO_SAMUEL.md](./EXPERIMENTO_SAMUEL.md)
- [RESILIENCIA.md](./RESILIENCIA.md)
- [KUBERNETES.md](./KUBERNETES.md)
- [INFORME_SAMUEL_6P.md](./INFORME_SAMUEL_6P.md)
- [BACKLOG.md](./BACKLOG.md)
- [USO_IA.md](./USO_IA.md)
- [OCI_DEPLOY_READINESS.md](./OCI_DEPLOY_READINESS.md)
- [OCI_COST_OPTIMIZATION.md](./OCI_COST_OPTIMIZATION.md)

URL OCI lab: `http://149.130.165.30` (NLB).  
OTLP compartido: `https://157.137.233.183:31443` (TLS + Basic) — ver [OBSERVABILIDAD_COMPARTIDA.md](./OBSERVABILIDAD_COMPARTIDA.md).  
Grafana OKE: `kubectl -n observability port-forward svc/grafana 3001:3000`. Local Docker: Prometheus `:9090`, Grafana `:3001`.

El 17 de noviembre de 2026 Prometheus todavía tenía `hotel_chaos_active` y `hotel_chaos_503_total` de R0 y de la R1 definitiva. Las 289, 320 y 349, y los tres p95, salen de k6 y están escritos en el dashboard como resultados archivados. La captura real es del dashboard ya provisionado, uid `seguimiento-4-multicloud`, ventana 00:40 a 01:20 -05: `evidencias/seguimiento-4-local/97-grafana-5xx.png` y `97-grafana-chaos-503.png`. Guardar el dashboard nuevo respondió 403. No se leyó el secreto de Grafana.

## Comandos rápidos de demostración

```bash
npm run build && npm test
npm run dev
curl -s localhost:3000/live
curl -s -H "x-trace-id: demo" localhost:3000/api/v2/habitacion/1
curl -s -H "x-chaos-token: $CHAOS_LAB_TOKEN" -H "content-type: application/json" \
  -d "{\"action\":\"enable\",\"durationSeconds\":30}" \
  localhost:3000/api/v2/chaos/dependency
```
