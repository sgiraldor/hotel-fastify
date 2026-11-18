# Parada y rollback SOLO del laboratorio seguridad-caos-exp4.
param(
  [string]$Reason = "operator_stop",
  [switch]$CleanupLabOnly,
  [switch]$ConfirmDestroyLabVolumes
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lab-common.ps1")
Assert-LabComposeProject
$events = Get-LabEventsDir
New-Item -ItemType Directory -Force -Path $events | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$stop = Join-Path $events "STOP"
@(
  "project=seguridad-caos-exp4",
  "reason=$Reason",
  "utc=$stamp"
) | Set-Content -Path $stop -Encoding utf8
Write-Host "STOP_WRITTEN=$stop"

$compose = Get-LabComposeFile
Write-Host "COMPOSE_STOP_SCOPE=project:seguridad-caos-exp4"
# Nota: no se ejecuta automáticamente en Fase 2; el operador lo invocará en smoke/R0/R1.
if ($env:EXP4_ALLOW_COMPOSE_STOP -eq "1") {
  docker compose -p seguridad-caos-exp4 -f $compose stop 2>&1 | Out-Host
  if ($CleanupLabOnly -and $ConfirmDestroyLabVolumes) {
    Write-Host "DESTRUCTIVE_CLEANUP=authorized for project seguridad-caos-exp4 only"
    docker compose -p seguridad-caos-exp4 -f $compose down --volumes --remove-orphans 2>&1 | Out-Host
  }
} else {
  Write-Host "COMPOSE_STOP_SKIPPED set EXP4_ALLOW_COMPOSE_STOP=1 to actually stop containers"
}
Write-Host "STOP_DONE"
