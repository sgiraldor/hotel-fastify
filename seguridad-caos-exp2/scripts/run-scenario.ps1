# Núcleo reproducible R0/R1. Requiere -Authorized. No invocar en Fase 4.
param(
  [Parameter(Mandatory)][ValidateSet("r0", "r1")][string]$Scenario,
  [switch]$Authorized,
  [int]$MaxMinutes = 30
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lab-common.ps1")

if (-not $Authorized) {
  Write-Error ("{0} bloqueado: falta -Authorized. No se ejecuta el experimento." -f $Scenario.ToUpper())
  exit 2
}

Assert-LabProjectName
Initialize-LabRuntimeDirs
Clear-LabStopFlag

$runId = ("{0}-{1}" -f $Scenario, (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ"))
$policyId = if ($Scenario -eq "r0") {
  "seguridad-caos-exp2-r0-permissive"
} else {
  "seguridad-caos-exp2-r1-restrictive"
}

Write-Host ("RUN_BEGIN scenario={0} run_id={1} utc={2}" -f $Scenario, $runId, (Get-Date).ToUniversalTime().ToString("o"))

try {
  if (Test-LabStopRequested) { throw "STOP/ABORT presente antes de iniciar" }

  # 1) Política + contexto ANTES de levantar gateway (evita eventos unscoped)
  & (Join-Path $PSScriptRoot "apply-policy.ps1") -Scenario $Scenario
  Set-LabRunContext -RunId $runId -Scenario $Scenario -PolicyId $policyId

  # 2) Archivar logs previos
  $eventsFile = Join-Path (Get-LabEventsDir) "events.jsonl"
  $alertsFile = Join-Path (Get-LabEventsDir) "alerts.jsonl"
  foreach ($f in @($eventsFile, $alertsFile, (Join-Path (Get-LabEventsDir) "watchdog.jsonl"))) {
    if (Test-Path $f) {
      Move-Item -Force $f ("{0}.bak-{1}" -f $f, $runId)
    }
  }

  # 3) Watchdog primero (sin deadline activo aún → idle, no STOP)
  Invoke-LabCompose -ComposeArgs @("up", "-d", "--build", "watchdog")
  $wdWait = (Get-Date).AddSeconds(30)
  do {
    Start-Sleep -Seconds 1
    $h = Test-LabWatchdogHealthy
    if ($h.Healthy) { break }
  } while ((Get-Date) -lt $wdWait)
  Assert-LabWatchdogHealthyOrCancel

  # 4) Plazo persistido (UTC) — el watchdog no lo reinicia al reiniciarse
  $deadlineIso = Set-LabExperimentDeadline -RunId $runId -Scenario $Scenario -MaxMinutes $MaxMinutes
  Write-Host ("DEADLINE_UTC={0}" -f $deadlineIso)

  # 5) Componentes de datos/control con contexto ya presente
  Invoke-LabCompose -ComposeArgs @("up", "-d", "--build", "mysql", "gateway", "detector")

  $mysqlDeadline = (Get-Date).AddMinutes([Math]::Min($MaxMinutes, 5))
  do {
    Assert-LabWatchdogHealthyOrCancel
    if (Test-LabStopRequested) { throw "STOP durante wait healthy" }
    $health = docker inspect -f "{{.State.Health.Status}}" seguridad-caos-exp2-mysql 2>$null
    if ($health -eq "healthy") { break }
    Start-Sleep -Seconds 3
  } while ((Get-Date) -lt $mysqlDeadline)
  if ($health -ne "healthy") { throw "MySQL lab no healthy a tiempo" }

  Assert-LabWatchdogHealthyOrCancel
  if (Test-LabStopRequested) { throw "STOP antes de sondas" }

  # Una sola ronda de intentos documentada: 1 sonda unauthorized + 1 sonda legitimate.
  # Exit codes de la sonda (0/1/2) son resultado experimental, NO fallo de infraestructura.
  Invoke-LabProbe -Service client-unauthorized
  Assert-LabWatchdogHealthyOrCancel
  if (Test-LabStopRequested) { throw "STOP tras sonda unauthorized" }

  Invoke-LabProbe -Service client-legitimate
  Assert-LabWatchdogHealthyOrCancel
  if (Test-LabStopRequested) { throw "STOP tras sonda legitimate" }

  # Esperar a que el detector lea connection_denied y emita alerta (poll ~0.5s).
  Start-Sleep -Seconds 5
  & (Join-Path $PSScriptRoot "capture-evidence.ps1") -Label $Scenario -RunId $runId

  $probeU = Get-ChildItem (Get-LabEvidenceDir) -Filter "probe-unauthorized-$Scenario-*.json" |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $probeL = Get-ChildItem (Get-LabEvidenceDir) -Filter "probe-legitimate-$Scenario-*.json" |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1

  $metricsOut = Join-Path (Get-LabRoot) ("evidencias\{0}\{1}\metrics.json" -f $Scenario, $runId)
  New-Item -ItemType Directory -Force -Path (Split-Path $metricsOut) | Out-Null

  $pyArgs = @(
    (Join-Path (Get-LabRoot) "scripts\compute-metrics.py"),
    "--events", $eventsFile,
    "--alerts", $alertsFile,
    "--run-id", $runId,
    "--scenario", $Scenario,
    "--policy-id", $policyId,
    "--out", $metricsOut
  )
  if ($probeU) { $pyArgs += @("--probe-unauthorized", $probeU.FullName) }
  if ($probeL) { $pyArgs += @("--probe-legitimate", $probeL.FullName) }
  & py -3 @pyArgs
  if ($LASTEXITCODE -ne 0) { throw "compute-metrics falló" }

  Write-Host ("METRICS_OUT={0}" -f $metricsOut)
}
finally {
  Clear-LabExperimentDeadline
  & (Join-Path $PSScriptRoot "stop-experiment.ps1") -Reason ("end_of_{0}" -f $Scenario)
  Write-Host ("RUN_END scenario={0} run_id={1}" -f $Scenario, $runId)
}
