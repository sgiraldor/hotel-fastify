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

1. **Jarrison / Daniel**: W3C E2E **confirmado** (`93-*`); coordinar k6 Baseline/R0/R1 runbook A
2. Ventana autorizada caos OKE + ejecución runbook A (aún **no** corrido)
3. Push remoto manual (`v1.1.0` intacto)
