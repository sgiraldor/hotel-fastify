# Runbook — Experimento A (Hotel OCI + mitigación Sports)

**NO EJECUTAR** hasta ventana autorizada del equipo.  
No saturar Sports/Cine sin coordinación. No tocar MySQL ni réplicas.

## Hipótesis

Ante 503 total de Hotel (`CHAOS_DEPENDENCY_DOWN`):

- **R0** (Sports sin mitigación / CB forzado cerrado o bypass): el flujo E2E falla o no degrada de forma controlada.
- **R1** (Sports con timeout + CB + fallback `partial`/`degraded`): Sports responde degradado sin martillar Hotel; Hotel `/live` sigue 200; al disable, recuperación.

Hotel callee **no** mejora success rate ante 503 total (evidencia LOCAL A: R0=R1=100% error en Hotel). La mejora E2E, si existe, es de **Sports**.

## Perfil de carga (idéntico Baseline / R0 / R1)

Acordar con Jarrison **antes** de correr (no inventar VU altos):

| Parámetro | Valor sugerido lab |
|-----------|--------------------|
| Target | `http://3.21.120.51:30080/api/v2/flujo/1/1/1` |
| k6 | mismo script y stages en las 3 rondas |
| Duración hold | p. ej. 30–60 s (corta; coordinada) |
| VUs | bajo (p. ej. 2–5) hasta autorización de carga |
| Aborto | error_rate sostenida no planificada en Sports; o chaos > duración |

## Métricas y umbrales

| Métrica | Baseline | R0 (Hotel 503, Sports sin mitigación útil) | R1 (Hotel 503, Sports mitigado) |
|---------|----------|--------------------------------------------|----------------------------------|
| Hotel `GET /habitacion/1` | 200 | **503** `CHAOS_DEPENDENCY_DOWN` | **503** |
| Hotel `/live` | 200 | **200** | **200** |
| Sports flujo HTTP | 200 `success` | fallo o no-partial (según R0) | **200** con `degraded=true` / `status=partial` (o semántica acordada) |
| Sports success_rate E2E “completo” | ~100% | ↓ | puede seguir bajo en “completo”; **sí** debe evitar cascada |
| p95 Sports | baseline | anotar | anotar (no fabricar mejora) |
| CB Sports | cerrado | — | abierto tras umbral |

No contar 503 de Hotel como éxito de negocio.

## Procedimiento (PowerShell)

```powershell
$env:HOTEL_BASE_URL = "http://149.130.165.30"
$env:SPORTS_BASE_URL = "http://3.21.120.51:30080"
$env:CHAOS_LAB_TOKEN = "<token-lab>"   # no versionar
$Duration = 60

function Assert-Steady {
  curl.exe -sS -o NUL -w "live=%{http_code}`n" "$env:HOTEL_BASE_URL/live"
  curl.exe -sS -o NUL -w "hab=%{http_code}`n" "$env:HOTEL_BASE_URL/api/v2/habitacion/1"
  curl.exe -sS -D - -o steady-flujo.json "$env:SPORTS_BASE_URL/api/v2/flujo/1/1/1" | Select-String "HTTP/|x-trace"
}

function Enable-Chaos {
  curl.exe -sS -X POST "$env:HOTEL_BASE_URL/api/v2/chaos/dependency" `
    -H "x-chaos-token: $env:CHAOS_LAB_TOKEN" -H "content-type: application/json" `
    -d "{\"action\":\"enable\",\"durationSeconds\":$Duration}"
}

function Disable-Chaos {
  curl.exe -sS -X POST "$env:HOTEL_BASE_URL/api/v2/chaos/dependency" `
    -H "x-chaos-token: $env:CHAOS_LAB_TOKEN" -H "content-type: application/json" `
    -d '{"action":"disable"}'
}

# --- Baseline (sin caos) ---
Assert-Steady
# k6 baseline → results/baseline.json   (coordinar con Jarrison)

# --- R0: caos Hotel + Sports SIN mitigación (flag/config que Jarrison defina) ---
try {
  Enable-Chaos
  curl.exe -sS -i "$env:HOTEL_BASE_URL/api/v2/habitacion/1"   # expect 503
  curl.exe -sS -i "$env:HOTEL_BASE_URL/live"                  # expect 200
  # k6 R0 misma carga → results/r0.json
  # capturar 1 respuesta Sports (degraded? status?)
} finally {
  Disable-Chaos
}
Start-Sleep -Seconds 2
Assert-Steady   # recuperación Hotel + flujo

# --- R1: caos Hotel + Sports CON timeout/CB/partial ---
try {
  Enable-Chaos
  # k6 R1 misma carga → results/r1.json
  # verificar Sports degraded/partial + CB
} finally {
  Disable-Chaos
}
Assert-Steady
```

## Rollback (obligatorio)

Siempre `disable` en `finally`. Si persiste 503: repetir disable; comprobar que no quede `CHAOS_DEPENDENCY_DOWN=true` en env del Deployment.

```powershell
.\chaos\revert-chaos.ps1   # con HOTEL_BASE_URL=http://149.130.165.30
```

## Relación con evidencias LOCAL

Experimento A LOCAL (`40-*`, `42-*`): R0=R1=100% error en Hotel bajo 503.  
Esta corrida OCI+Sports mide **mitigación del caller**, no inventa disponibilidad en Hotel.
