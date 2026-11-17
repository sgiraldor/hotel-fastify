# Demo controlada — Experimento A sobre OCI (NO ejecutar aún)

Runbook listo para ventana autorizada. **No ejecutar** hasta permiso explícito del equipo.
No altera MySQL, réplicas ni NLB. Solo interruptor temporal de dependencia.

## Prerrequisitos

```powershell
$env:HOTEL_BASE_URL = "http://149.130.165.30"
# Token ya desplegado en el Secret de OKE (no versionar el valor):
$env:CHAOS_LAB_TOKEN = "<token-lab>"   # o: kubectl get secret hotel-api-secrets -o jsonpath='{.data.CHAOS_LAB_TOKEN}' | %{[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($_))}
$Duration = 60   # segundos; tope API = 300
```

Verificar steady state **antes**:

```powershell
curl.exe -sS -i "$env:HOTEL_BASE_URL/live"
curl.exe -sS -i "$env:HOTEL_BASE_URL/ready"
curl.exe -sS -i -H "x-trace-id: demo-pre" "$env:HOTEL_BASE_URL/api/v2/habitacion/1"
# Esperado: 200 / 200 / 200 + JSON habitación
```

## Activación (duración limitada)

```powershell
curl.exe -sS -i -X POST "$env:HOTEL_BASE_URL/api/v2/chaos/dependency" `
  -H "x-chaos-token: $env:CHAOS_LAB_TOKEN" `
  -H "content-type: application/json" `
  -d "{\"action\":\"enable\",\"durationSeconds\":$Duration}"
```

Estado:

```powershell
curl.exe -sS -H "x-chaos-token: $env:CHAOS_LAB_TOKEN" `
  "$env:HOTEL_BASE_URL/api/v2/chaos/dependency"
```

## Durante el fallo (obligatorio)

```powershell
# Negocio → 503 CHAOS_DEPENDENCY_DOWN + x-trace-id
curl.exe -sS -i -H "x-trace-id: demo-chaos" "$env:HOTEL_BASE_URL/api/v2/habitacion/1"

# Probes → siguen 200 (blast radius acotado)
curl.exe -sS -i "$env:HOTEL_BASE_URL/live"
curl.exe -sS -i "$env:HOTEL_BASE_URL/ready"
```

## Reversión en `finally` (siempre)

PowerShell con `try/finally` — **ejecutar disable aunque falle la verificación**:

```powershell
try {
  # ... activación + checks 503 / live 200 ...
}
finally {
  curl.exe -sS -i -X POST "$env:HOTEL_BASE_URL/api/v2/chaos/dependency" `
    -H "x-chaos-token: $env:CHAOS_LAB_TOKEN" `
    -H "content-type: application/json" `
    -d "{\"action\":\"disable\"}"
}
```

Equivalente repo local:

```powershell
$env:HOTEL_BASE_URL = "http://149.130.165.30"
.\chaos\revert-chaos.ps1
```

## Verificación de recuperación

```powershell
Start-Sleep -Seconds 2
curl.exe -sS -i -H "x-trace-id: demo-post" "$env:HOTEL_BASE_URL/api/v2/habitacion/1"
curl.exe -sS -i "$env:HOTEL_BASE_URL/live"
# Esperado: habitación 200 + live 200; chaos.activo = false
curl.exe -sS -H "x-chaos-token: $env:CHAOS_LAB_TOKEN" `
  "$env:HOTEL_BASE_URL/api/v2/chaos/dependency"
```

## Abortar / seguridad

- Si `enable` responde 401 → detener; no forzar token en claro en logs.
- Si tras `disable` sigue 503 → repetir `disable`; comprobar que `CHAOS_DEPENDENCY_DOWN` no esté en env del Deployment.
- No usar `kubectl delete`, no tocar MySQL, no cambiar réplicas.
- Duración sugerida demo: **30–60 s**. No dejar enable sin finally.

## Relación con evidencias

Experimento A **ya validado en LOCAL** (`40-*`, `42-*`): R0=R1=100% error bajo 503 total.  
Esta demo OCI solo repite el contrato HTTP en la URL pública cuando haya ventana autorizada.
