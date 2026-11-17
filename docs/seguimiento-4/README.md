# Seguimiento #4 — Hotel API (Samuel)

## Arquitectura del grupo

```text
Cliente/k6 -> Sports (AWS) -> Hotel (OCI) -> Sports -> Cine (GCP) -> Sports -> Cliente
```

| Persona | API | Cloud | Experimento |
|---|---|---|---|
| Jarrison | Sports (coordinador) | AWS/K8s | Latencia + k6 + Chaos Gate |
| Samuel | Hotel | OCI/K8s | Indisponibilidad de dependencia |
| Daniel | Cine | GCP/K8s | Agotamiento de recursos + checklist K8s |

Hotel **no** es coordinador y **no** llama a Cine.

## Rol de Hotel en OCI

- CRUD legacy + contrato `GET /api/v2/habitacion/:id` para Sports.
- Trazabilidad `x-trace-id` + OpenTelemetry.
- Despliegue reproducible vía `k8s/` (OKE cuando exista cluster).
- Interruptor propio + experimento Chaos Toolkit.
- Fail-fast + bulkhead (`RESILIENCE_MODE`).

## Índice

- [RESULTADOS_EXPERIMENTOS.md](./RESULTADOS_EXPERIMENTOS.md) — A (obligatorio) + B/C (complementarios)
- [SUSTENTACION.md](./SUSTENTACION.md) — guía breve de demo + limitaciones reales
- [GUIA_INTEGRACION_JARRISON.md](./GUIA_INTEGRACION_JARRISON.md) — integración inmediata Sports→Hotel
- [CONTRATO_SPORTS_HOTEL.md](./CONTRATO_SPORTS_HOTEL.md) — contrato técnico completo
- [FLUJO_MULTICLOUD.md](./FLUJO_MULTICLOUD.md) — HTTP E2E real vs OTel E2E
- [DEMO_OCI_EXPERIMENTO_A.md](./DEMO_OCI_EXPERIMENTO_A.md) — caos Hotel OCI (**no ejecutado**)
- [RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md](./RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md) — Baseline/R0/R1 con Sports (**no ejecutado**)
- [CONTRATOS_MULTICLOUD.md](./CONTRATOS_MULTICLOUD.md)
- [OBSERVABILIDAD_COMPARTIDA.md](./OBSERVABILIDAD_COMPARTIDA.md)
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
