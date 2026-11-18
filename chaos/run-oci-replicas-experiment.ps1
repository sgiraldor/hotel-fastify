# Orquesta el experimento declarativo de Hotel contra las dos réplicas OCI.
# Por defecto solo hace dry-run (no activa el fallo).
# La ejecución real exige -ConfirmExperiment y deja CHAOS_OCI_CONFIRM=YES.
# Parada de emergencia: .\chaos\chaos-replicas.ps1 -Action disable
param(
  [switch]$ConfirmExperiment,
  [switch]$RealRun,
  [int]$DurationSeconds = 60,
  [int]$ObserveSeconds = 5,
  [string]$JournalPath = ''
)

$ErrorActionPreference = 'Stop'

if ($DurationSeconds -lt 1 -or $DurationSeconds -gt 300) {
  Write-Error 'DurationSeconds debe estar entre 1 y 300.'
}
if ($ObserveSeconds -lt 1 -or $ObserveSeconds -gt 60) {
  Write-Error 'ObserveSeconds debe estar entre 1 y 60.'
}

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

$chaosExe = Join-Path $repoRoot '.venv-chaos\Scripts\chaos.exe'
if (-not (Test-Path -LiteralPath $chaosExe)) {
  if (Get-Command chaos -ErrorAction SilentlyContinue) {
    $chaosExe = 'chaos'
  } else {
    Write-Error 'Chaos Toolkit no está instalado (.venv-chaos o chaos en PATH).'
  }
}

$experiment = Join-Path $PSScriptRoot 'experiment-hotel-oci-replicas.json'
if (-not $JournalPath) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $JournalPath = Join-Path $repoRoot "evidencias\seguimiento-4-local\oci-replicas-journal-$stamp.json"
}

# El provider Python vive en chaos/ y debe importarse como oci_replicas_provider.
$chaosDir = $PSScriptRoot
if ($env:PYTHONPATH) {
  $env:PYTHONPATH = "$chaosDir;$env:PYTHONPATH"
} else {
  $env:PYTHONPATH = $chaosDir
}

$env:CHAOS_OCI_DURATION = [string]$DurationSeconds
$env:CHAOS_OCI_OBSERVE_SEC = [string]$ObserveSeconds

Write-Host "Experimento: $experiment"
Write-Host "Journal:     $JournalPath"
Write-Host "TTL:         $DurationSeconds s (máximo API 300 s)"
Write-Host "Observación: $ObserveSeconds s"
Write-Host "PYTHONPATH:  $env:PYTHONPATH"

if (-not $RealRun) {
  Write-Host 'Modo seguro: dry-run de activities. No activa el 503.'
  Write-Host 'Una validación local o dry-run NO demuestra ejecución real en OCI.'
  & $chaosExe validate $experiment
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $chaosExe run --dry activities --rollback-strategy always --journal-path $JournalPath $experiment
  exit $LASTEXITCODE
}

if (-not $ConfirmExperiment) {
  Write-Error 'Ejecución real rechazada. Hace falta -RealRun y -ConfirmExperiment juntos.'
}

$env:CHAOS_OCI_CONFIRM = 'YES'
Write-Warning 'EJECUCIÓN REAL: se activará HTTP 503 en las dos réplicas de Hotel OCI.'
Write-Host 'Parada de emergencia si hace falta: powershell -NoProfile -File .\chaos\chaos-replicas.ps1 -Action disable'

$exitCode = 1
try {
  & $chaosExe run --rollback-strategy always --journal-path $JournalPath $experiment
  $exitCode = $LASTEXITCODE
} finally {
  Remove-Item Env:CHAOS_OCI_CONFIRM -ErrorAction SilentlyContinue
  Write-Host 'Post-check de seguridad: disable en ambas réplicas.'
  & powershell -NoProfile -File (Join-Path $PSScriptRoot 'chaos-replicas.ps1') -Action disable
}
exit $exitCode
