# Guía breve de sustentación — Hotel (Samuel)

## Qué demostrar (5–7 min)

1. **Contrato**: `GET /api/v2/habitacion/:id` + `x-trace-id` (local y OCI).
2. **Caos**: Chaos Toolkit local → steady 200 → 503 → `/live` 200 → recovery 200.
3. **Observabilidad**: Prometheus scrapea `/metrics/prometheus`; Grafana en `:3001`.
4. **Carga A (503)**: R0=R1=100% error — sin mejora de éxito (evidencia conservada).
5. **Carga B (MySQL lenta)**: R1 acota p95 (−22%) y activa fail-fast; **no** mejora success rate.
6. **Resiliencia honesta**: no vender 504 como disponibilidad; E2E → Sports.
7. **OCI**: 2 pods Ready, NLB Free, URL pública.

## Comandos rápidos

```powershell
# Chaos Toolkit
$env:HOTEL_BASE_URL="http://127.0.0.1:3000"
$env:CHAOS_LAB_TOKEN="..."
.\chaos\run-experiment.ps1

# Observabilidad
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d prometheus grafana
# Grafana http://127.0.0.1:3001  Prometheus http://127.0.0.1:9090

# Rondas k6
.\scripts\experiments\run-k6-rounds.ps1

# OCI
curl http://149.130.165.30/api/v2/habitacion/1 -i
```

## Local vs OCI

| Evidencia | Ámbito |
|-----------|--------|
| Chaos Toolkit journal `40-*` | LOCAL |
| Prometheus/Grafana `41-*` | LOCAL |
| k6 Baseline/R0/R1 `42-*` | LOCAL |
| Resilience modes `43-*` | LOCAL |
| Pods/NLB/HTTP `44-*` y `28-39` | OCI |

**No presentar pruebas locales como multicloud E2E.** Falta Sports (Jarrison) y Cine (Daniel).
