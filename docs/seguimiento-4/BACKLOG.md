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
- [x] Collector OTLP compartido en OKE + Tempo + Prometheus + Grafana (NodePort, sin NLB extra)
- [x] Export OTLP real Hotel → Tempo/Prometheus (evidencias `80-*`)
- [x] Contrato telemetría para Sports/Cine (`OBSERVABILIDAD_COMPARTIDA.md`)

## Solo equipo / autorización

1. **Jarrison (Sports)**: timeout + CB + `partial` + traza; **exportar OTLP** a NodePort con Basic Auth; k6 E2E
2. **Daniel (Cine)**: API GCP + **exportar OTLP** con `service.name=cine-api`
3. Ventana autorizada de caos en OKE (`DEMO_OCI_EXPERIMENTO_A.md`)
4. Push remoto manual (`v1.1.0` intacto)
5. (Opcional) HTTPS/NLB extra **solo con autorización de costo**
