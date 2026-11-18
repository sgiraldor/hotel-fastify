# Adaptador fino para Chaos Toolkit. No reimplementa la inyección:
# delega en chaos-replicas.ps1 (kubectl exec a cada pod + pod-switch.js).
# Enable solo corre si CHAOS_OCI_CONFIRM=YES. Sin token en este archivo.
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('status', 'enable', 'verify-active', 'disable')]
  [string]$Action
)

$ErrorActionPreference = 'Stop'

$replicas = Join-Path $PSScriptRoot 'chaos-replicas.ps1'
if (-not (Test-Path -LiteralPath $replicas)) {
  Write-Error "No está chaos-replicas.ps1 en $PSScriptRoot"
}

$duration = 60
if ($env:CHAOS_OCI_DURATION -match '^[0-9]+$') {
  $duration = [int]$env:CHAOS_OCI_DURATION
}
if ($duration -lt 1 -or $duration -gt 300) {
  Write-Error "CHAOS_OCI_DURATION debe estar entre 1 y 300. Recibido: $duration"
}

$habitacionId = if ($env:HOTEL_HABITACION_ID) { $env:HOTEL_HABITACION_ID } else { '1' }

if ($Action -eq 'enable') {
  if ($env:CHAOS_OCI_CONFIRM -ne 'YES') {
    Write-Error 'Enable bloqueado. CHAOS_OCI_CONFIRM debe ser YES. Usa run-oci-replicas-experiment.ps1 -ConfirmExperiment.'
  }
  & powershell -NoProfile -File $replicas `
    -Action enable `
    -DurationSeconds $duration `
    -ExpectedReplicas 2 `
    -HabitacionId $habitacionId `
    -ConfirmExperiment `
    -SkipK6WindowGate
  exit $LASTEXITCODE
}

& powershell -NoProfile -File $replicas `
  -Action $Action `
  -DurationSeconds $duration `
  -ExpectedReplicas 2 `
  -HabitacionId $habitacionId
exit $LASTEXITCODE
