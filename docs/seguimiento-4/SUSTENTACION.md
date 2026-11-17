# Guía breve de sustentación — Hotel (Samuel)

## Qué demostrar (5–7 min)

1. **Contrato OCI**: `GET http://149.130.165.30/api/v2/habitacion/:id` → 200 + `x-trace-id`.
2. **W3C E2E**: Tempo Trace ID `4d2c23eb...` / `4f8140a1...` con SERVER `sports-api`+`hotel-api`+`cine-api` (evidencia `93-*`).
3. **Caos LOCAL**: Chaos Toolkit → steady 200 → 503 → `/live` 200 → recovery 200.
4. **Experimento A (obligatorio)**: R0=R1=**100% error** bajo 503 — **sin mejora de disponibilidad** en Hotel.
5. **B/C (complementarios, no reemplazan A)**: fail-fast/bulkhead aíslan; success no mejora.
6. **Honestidad**: rechazo/504 rápido ≠ éxito; mitigación E2E ante 503 → Sports.
7. **OCI vivo**: 2 pods Hotel + MySQL Ready; caos cloud **listo, no ejecutado**.

## Limitaciones reales (decirlas)

| Hecho | Implicación |
|-------|-------------|
| A: R0=R1 100% error | Hotel callee no recupera disponibilidad ante 503 total |
| B: success R1 = 0% | Fail-fast recorta cola; no inventa éxito |
| C: success R1 ≈ 0.03% | Bulkhead aísla MySQL; sacrifica throughput exitoso |
| Caos OCI no corrido | Runbook `DEMO_OCI_EXPERIMENTO_A.md` pendiente de ventana |
| W3C E2E | **Completa** tras propagación Sports/Cine (`93-*`); no confundir con caos A |

## Comandos rápidos

```powershell
# Chaos Toolkit LOCAL
$env:HOTEL_BASE_URL="http://127.0.0.1:3000"
$env:CHAOS_LAB_TOKEN="..."
.\chaos\run-experiment.ps1

# Observabilidad LOCAL
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d prometheus grafana

# OCI (verificación, sin caos)
curl.exe -sS -i http://149.130.165.30/live
curl.exe -sS -i -H "x-trace-id: demo" http://149.130.165.30/api/v2/habitacion/1

# Demo A en OCI — SOLO con autorización (ver DEMO_OCI_EXPERIMENTO_A.md)
```

## Evidencias (intactas)

| Prefijo | Contenido | Ámbito |
|---------|-----------|--------|
| `40-*` | Chaos Toolkit journal | LOCAL |
| `41-*` | Prometheus | LOCAL |
| `42-*` | k6 A Baseline/R0/R1 | LOCAL |
| `50-*` | B MySQL Toxiproxy | LOCAL |
| `60-*` | C bulkhead 24 VU | LOCAL |
| `28-39`, `44-*`, `70-*` | OKE pods/HTTP | OCI |
| `91-*` | Cine OTLP | OCI Tempo/Prom |
| `92-*` | W3C incompleto (histórico) | OCI Tempo |
| `93-*` | W3C E2E completo 3 APIs | OCI Tempo |

## Integración Sports

Guía corta: `GUIA_INTEGRACION_JARRISON.md` · Contrato: `CONTRATO_SPORTS_HOTEL.md`.
