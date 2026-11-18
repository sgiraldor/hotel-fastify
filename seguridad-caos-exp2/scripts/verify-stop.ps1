# Verificación automatizada del interruptor STOP (sin levantar el experimento completo).
# Comprueba rutas unificadas y, si los contenedores lab están arriba, presencia del flag montado.
# No crea recursos ajenos. No ejecuta R0/R1.
param(
  [switch]$RequireRunningContainers
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lab-common.ps1")

Assert-LabProjectName
Initialize-LabRuntimeDirs

$failures = @()
$hostStop = Get-LabStopPath
$expectedInContainer = "/events/STOP"

Write-Host ("HOST_STOP_PATH={0}" -f $hostStop)
Write-Host ("CONTAINER_STOP_PATH={0}" -f $expectedInContainer)

# Escribir y leer ciclo en host
Write-LabStopFlag -Reason "verify-stop"
if (-not (Test-Path $hostStop)) { $failures += "STOP no existe en host tras Write-LabStopFlag" }
$content = Get-Content $hostStop -Raw
if ($content -notmatch "project=seguridad-caos-exp2") { $failures += "STOP sin marca de proyecto" }

# Compose declara el mismo montaje
$compose = Get-Content (Get-LabComposeFile) -Raw
if ($compose -notmatch '\./runtime/events:/events') {
  $failures += "compose no monta ./runtime/events:/events"
}
if ($compose -notmatch 'STOP_FLAG:\s*/events/STOP') {
  $failures += "compose no define STOP_FLAG=/events/STOP"
}

if ($RequireRunningContainers) {
  $gw = docker ps -q --filter "name=seguridad-caos-exp2-gateway" --filter "status=running"
  if (-not $gw) {
    $failures += "gateway no está running (RequireRunningContainers)"
  } else {
    docker exec seguridad-caos-exp2-gateway test -f /events/STOP
    if ($LASTEXITCODE -ne 0) { $failures += "gateway no ve /events/STOP" }
  }
} else {
  Write-Host "RUNTIME_CONTAINER_CHECK=skipped (usar -RequireRunningContainers cuando el lab esté arriba)"
}

Clear-LabStopFlag
if (Test-Path $hostStop) { $failures += "STOP no se limpió tras Clear-LabStopFlag" }

if ($failures.Count -gt 0) {
  Write-Host "VERIFY_STOP=FAIL"
  $failures | ForEach-Object { Write-Host (" - {0}" -f $_) }
  exit 1
}

Write-Host "VERIFY_STOP=PASS (estático+host; runtime container opcional)"
exit 0
