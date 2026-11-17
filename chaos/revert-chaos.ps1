$ErrorActionPreference = "Stop"
if (-not $env:HOTEL_BASE_URL) { $env:HOTEL_BASE_URL = "http://127.0.0.1:3000" }
if ($env:HOTEL_BASE_URL -match '149\.130\.165\.30') {
  Write-Error "El NLB no apaga las dos replicas. Usa .\chaos\chaos-replicas.ps1 -Action disable"
}
if (-not $env:CHAOS_LAB_TOKEN) { Write-Error "CHAOS_LAB_TOKEN es obligatorio" }

Invoke-RestMethod -Method Post -Uri "$env:HOTEL_BASE_URL/api/v2/chaos/dependency" `
  -Headers @{ "x-chaos-token" = $env:CHAOS_LAB_TOKEN } `
  -ContentType "application/json" `
  -Body (@{ action = "disable" } | ConvertTo-Json)

Write-Host "Caos desactivado"
