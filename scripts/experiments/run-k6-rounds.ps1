# Ejecuta Baseline / R0 / R1 con el MISMO perfil k6.
# R0: RESILIENCE_MODE=unprotected + caos
# R1: RESILIENCE_MODE=protected + caos
# Baseline: protected + sin caos
param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [string]$Token = $env:CHAOS_LAB_TOKEN,
  [string]$HabitacionId = "1",
  [int]$ChaosSeconds = 40
)

$ErrorActionPreference = "Stop"
$k6 = "C:\Program Files\k6\k6.exe"
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root
New-Item -ItemType Directory -Force -Path scripts\experiments\results | Out-Null

if (-not $Token) { throw "CHAOS_LAB_TOKEN requerido" }

function Restart-Api([string]$Mode) {
  Write-Host "Reiniciando api con RESILIENCE_MODE=$Mode"
  $env:RESILIENCE_MODE = $Mode
  $env:CHAOS_LAB_TOKEN = $Token
  docker compose up -d --force-recreate api | Out-Host
  $deadline = (Get-Date).AddMinutes(3)
  do {
    Start-Sleep -Seconds 3
    try {
      $r = Invoke-WebRequest "$BaseUrl/ready" -UseBasicParsing -TimeoutSec 5
      if ($r.StatusCode -eq 200) { break }
    } catch {}
  } while ((Get-Date) -lt $deadline)
  $modeJson = (Invoke-RestMethod "$BaseUrl/metrics").resilience_mode
  Write-Host "API ready resilience_mode=$modeJson"
  if ($modeJson -ne $Mode) { throw "Modo esperado $Mode, obtenido $modeJson" }
}

function Set-Chaos([string]$Action) {
  $body = @{ action = $Action; durationSeconds = $ChaosSeconds } | ConvertTo-Json
  Invoke-RestMethod -Method POST -Uri "$BaseUrl/api/v2/chaos/dependency" `
    -Headers @{ "x-chaos-token" = $Token; "Content-Type" = "application/json" } `
    -Body $body | Out-Null
}

function Invoke-K6([string]$Round) {
  Write-Host "=== k6 ROUND $Round ==="
  & $k6 run `
    -e "HOTEL_BASE_URL=$BaseUrl" `
    -e "HABITACION_ID=$HabitacionId" `
    -e "ROUND=$Round" `
    scripts\experiments\k6-hotel-profile.js
}

# Baseline
Restart-Api "protected"
Invoke-K6 "baseline"

# R0 unprotected + chaos
Restart-Api "unprotected"
Set-Chaos "enable"
Invoke-K6 "r0"
Set-Chaos "disable"

# R1 protected + chaos (mismo fallo/duración/perfil)
Restart-Api "protected"
Set-Chaos "enable"
Invoke-K6 "r1"
Set-Chaos "disable"

Write-Host "Rondas completadas. Ver scripts/experiments/results/"
