$ErrorActionPreference = "Stop"

if (-not $env:HOTEL_BASE_URL) { $env:HOTEL_BASE_URL = "http://127.0.0.1:3000" }
if (-not $env:HOTEL_HABITACION_ID) { $env:HOTEL_HABITACION_ID = "1" }
if (-not $env:CHAOS_LAB_TOKEN) {
  Write-Error "CHAOS_LAB_TOKEN es obligatorio"
}

Write-Host "Steady-state check..."
$live = Invoke-WebRequest -Uri "$env:HOTEL_BASE_URL/live" -UseBasicParsing
if ($live.StatusCode -ne 200) { throw " /live no esta OK" }

Write-Host "Ejecutando Chaos Toolkit (si esta instalado)..."
if (Get-Command chaos -ErrorAction SilentlyContinue) {
  chaos run "$PSScriptRoot/experiment-hotel-dependency.json"
} else {
  Write-Host "chaostoolkit no instalado; usando runner local Node..."
  node "$PSScriptRoot/run-local.mjs"
}
