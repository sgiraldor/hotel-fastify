# Backlog pendiente

## Hecho por Samuel (cierre independiente)

- [x] OKE Basic + Hotel 2 réplicas + MySQL lab + NLB + OCIR
- [x] Chaos Toolkit real LOCAL
- [x] Prometheus/Grafana locales
- [x] Experimento A 503: Baseline/R0/R1 (sin mejora de éxito; evidencias conservadas)
- [x] Experimento B MySQL degradada (complementario): Toxiproxy + k6 + fail-fast
- [x] Experimento C bulkhead (complementario): aislamiento real; success no mejora
- [x] Fail-fast + bulkhead + métricas de activación
- [x] Contrato + guía compacta Sports→Hotel
- [x] Runbook demo OCI Experimento A (sin ejecutar)
- [x] Docs A/B/C consolidados + sustentación con limitaciones reales
- [x] Build + 68 tests verdes en cierre

## Solo equipo / autorización

1. **Jarrison (Sports)**: timeout + CB + respuesta `partial` + `x-trace-id`/`traceparent`; Chaos Gate E2E; k6 común; cliente AWS→OCI
2. **Daniel (Cine)**: API GCP + correlación multicloud
3. Ventana autorizada de caos en OKE (`DEMO_OCI_EXPERIMENTO_A.md`)
4. Push remoto manual (`v1.1.0` intacto)
