# Parada y rollback SOLO del laboratorio seguridad-caos-exp2.
# Por defecto: STOP + restaurar politica R0 + compose stop (sin borrar volumenes/evidencias).
# Limpieza destructiva: requiere -ConfirmDestroyLabVolumes (desactivada por defecto).
param(
  [int]$MaxMinutes = 30,
  [switch]$CleanupLabOnly,
  [switch]$ConfirmDestroyLabVolumes,
  [string]$Reason = "operator_stop"
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lab-common.ps1")

Assert-LabProjectName
Initialize-LabRuntimeDirs

$Utc = (Get-Date).ToUniversalTime().ToString("o")
Write-Host ("STOP_BEGIN utc={0} max_minutes_hint={1} reason={2}" -f $Utc, $MaxMinutes, $Reason)

# 1) Interruptor unificado + desactivar deadline (conserva plazo original en archivo)
Write-LabStopFlag -Reason $Reason
Clear-LabExperimentDeadline
Write-Host ("STOP_FLAG={0}" -f (Get-LabStopPath))
Write-Host ("ABORT_FLAG={0}" -f (Get-LabAbortPath))

# 2) Preservar evidencias (no borrar runtime/evidence ni runtime/events)
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$preserveDir = Join-Path (Get-LabRoot) ("evidencias\stop-" + $stamp)
New-Item -ItemType Directory -Force -Path $preserveDir | Out-Null
Copy-Item -Recurse -Force (Get-LabEventsDir) (Join-Path $preserveDir "events") -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force (Get-LabEvidenceDir) (Join-Path $preserveDir "evidence") -ErrorAction SilentlyContinue
Write-Host ("EVIDENCE_PRESERVED={0}" -f $preserveDir)

# 3) Restaurar politica estable R0
& (Join-Path $PSScriptRoot "apply-policy.ps1") -Scenario r0
Write-Host "POLICY_RESTORED=r0"

# 4) Detener SOLO servicios del proyecto del laboratorio (sin --volumes)
$composeFile = Get-LabComposeFile
Write-Host "COMPOSE_STOP_SCOPE=project:seguridad-caos-exp2"
$prev = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$stopOut = & docker compose -p seguridad-caos-exp2 -f $composeFile stop 2>&1
$stopCode = $LASTEXITCODE
$ErrorActionPreference = $prev
$stopOut | ForEach-Object { Write-Host $_ }
Write-Host ("COMPOSE_STOP_EXIT={0}" -f $stopCode)

# Si no hay contenedores del lab, exit != 0 puede ser benigno; verificar estado real.
$labAny = @(docker ps -aq --filter "label=experimento=seguridad-caos-exp2" 2>$null)
if ($stopCode -ne 0 -and $labAny.Count -gt 0) {
  Write-Warning ("compose stop exit={0}; reintentando stop por nombre de proyecto" -f $stopCode)
  $ErrorActionPreference = "Continue"
  & docker compose -p seguridad-caos-exp2 -f $composeFile stop 2>&1 | Out-Host
  $stopCode = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  Write-Host ("COMPOSE_STOP_RETRY_EXIT={0}" -f $stopCode)
}

# 5) Verificacion REAL de terminacion (no basta ocultar stderr)
[void](Assert-LabContainersStopped -Retries 15 -DelaySeconds 1)

# Confirmacion adicional por inspect Status
$still = @()
foreach ($name in @("seguridad-caos-exp2-mysql","seguridad-caos-exp2-gateway","seguridad-caos-exp2-detector","seguridad-caos-exp2-watchdog")) {
  $st = docker inspect -f "{{.State.Status}}" $name 2>$null
  if ($st -eq "running") { $still += $name }
}
if ($still.Count -gt 0) {
  throw ("Rollback fallido: siguen running: {0}" -f ($still -join ","))
}
Write-Host "ROLLBACK_CONTAINER_STATE_VERIFIED=stopped_or_absent"

Write-Host "NO_DOCKER_SYSTEM_PRUNE=confirmed"
Write-Host "OTHER_PROJECTS=not_targeted"

# 6) Limpieza destructiva opcional
if ($CleanupLabOnly) {
  if (-not $ConfirmDestroyLabVolumes) {
    Write-Host "DESTRUCTIVE_CLEANUP=skipped (falta -ConfirmDestroyLabVolumes)"
    Write-Host ("HINT: docker compose -p seguridad-caos-exp2 -f {0} down --remove-orphans" -f $composeFile)
    Write-Host "HINT_VOLUMES: anadir --volumes SOLO con -ConfirmDestroyLabVolumes (borra mysql_data del lab)."
  } else {
    Write-Host "DESTRUCTIVE_CLEANUP=authorized for project seguridad-caos-exp2 only"
    $ErrorActionPreference = "Continue"
    & docker compose -p seguridad-caos-exp2 -f $composeFile down --volumes --remove-orphans 2>&1 | Out-Host
    $downCode = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
    if ($downCode -ne 0) { throw ("down --volumes fallo exit={0}" -f $downCode) }
  }
}

Write-Host ("STOP_END utc={0}" -f (Get-Date).ToUniversalTime().ToString("o"))
