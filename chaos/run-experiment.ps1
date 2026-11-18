$ErrorActionPreference = "Stop"

if (-not $env:HOTEL_BASE_URL) { $env:HOTEL_BASE_URL = "http://127.0.0.1:3000" }
if (-not $env:HOTEL_HABITACION_ID) { $env:HOTEL_HABITACION_ID = "1" }
if (-not $env:CHAOS_LAB_TOKEN) {
  Write-Error "CHAOS_LAB_TOKEN es obligatorio"
}

Write-Host "Steady-state check..."
$live = Invoke-WebRequest -Uri "$env:HOTEL_BASE_URL/live" -UseBasicParsing
if ($live.StatusCode -ne 200) { throw " /live no esta OK" }

$repoRoot = Split-Path $PSScriptRoot -Parent
$venvChaos = Join-Path $repoRoot ".venv-chaos\Scripts\chaos.exe"
$journal = Join-Path $repoRoot "evidencias\seguimiento-4-local\40-chaostoolkit-journal.json"

Write-Host "Ejecutando Chaos Toolkit..."
if (Test-Path $venvChaos) {
  & $venvChaos run --journal-path $journal "$PSScriptRoot/experiment-hotel-dependency.json"
} elseif (Get-Command chaos -ErrorAction SilentlyContinue) {
  chaos run --journal-path $journal "$PSScriptRoot/experiment-hotel-dependency.json"
} else {
  Write-Error "Chaos Toolkit no instalado. Crear .venv-chaos e instalar chaostoolkit (no usar run-local.mjs como sustituto)."
}
