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

1. **Jarrison**: OTLP `sports-api` OK; **inyectar `traceparent`** en HTTP a Hotel/Cine para W3C E2E; coordinar k6 R0/R1 runbook A
2. **Daniel**: OTLP `cine-api` OK; **extraer `traceparent`** y exportar SERVER span al Trace ID de Sports
3. Re-verificar en Tempo un Trace ID con `sports-api`+`hotel-api`+`cine-api` (hoy `ad97747b...` = NO)
4. Ventana autorizada caos OKE + runbook A (aún **no** corrido)
5. Push remoto manual (`v1.1.0` intacto)
