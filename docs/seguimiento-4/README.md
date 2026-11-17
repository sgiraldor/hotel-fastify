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
