# Runner R0/R1 - H1/H2 corregidos. No ejecuta compose salvo flags explicitos.
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("r0", "r1")]
  [string]$Scenario,
  [switch]$Authorized,
  [int]$MaxMinutes = 30
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lab-common.ps1")
Assert-LabComposeProject
Initialize-LabRuntime

if (-not $Authorized) {
  Write-Host "REFUSED: pass -Authorized only when an operator explicitly starts an experiment window"
  exit 2
}
if ($env:EXP4_ALLOW_COMPOSE -ne "1") {
  Write-Host "REFUSED: set EXP4_ALLOW_COMPOSE=1 to allow docker compose actions for this lab only"
  exit 2
}

Assert-NoStop
$runId = New-LabRunId -Scenario $Scenario
Write-LabDeadline -RunId $runId -MaxMinutes $MaxMinutes

$plan = Get-LabWritePlan
$Initial = [int]$plan.initial_commits
$Mid = [int]$plan.mid_commits
$Final = [int]$plan.final_commits
$IntervalMs = [int]$plan.interval_ms

$intervalObj = 300
if ($Scenario -eq "r1") { $intervalObj = 30 }
if ($Scenario -eq "r0" -and $env:BACKUP_INTERVAL_R0_SEC) { $intervalObj = [int]$env:BACKUP_INTERVAL_R0_SEC }
if ($Scenario -eq "r1" -and $env:BACKUP_INTERVAL_R1_SEC) { $intervalObj = [int]$env:BACKUP_INTERVAL_R1_SEC }

$compose = Get-LabComposeFile
Write-Host "RUN_ID=$runId SCENARIO=$Scenario"
Write-Host ("WRITE_PLAN total={0} initial={1} mid={2} final={3} intervalMs={4}" -f $plan.total, $Initial, $Mid, $Final, $IntervalMs)
Write-Host "G1=extra_mid_backup_only_on_r1 G2=automated_restore_on_r1"

docker compose -p seguridad-caos-exp4 -f $compose up -d mysql monitor watchdog
if ($LASTEXITCODE -ne 0) { throw "compose up failed" }

$deadlineHb = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadlineHb) {
  if (Test-WatchdogHealthy) { break }
  Start-Sleep -Seconds 1
}
if (-not (Test-WatchdogHealthy)) { throw "watchdog not healthy" }

function Invoke-Gen {
  param([int]$Count, [int]$SeqStart)
  Assert-NoStop
  if (-not (Test-WatchdogHealthy)) { throw "watchdog unhealthy - cancelling" }
  docker compose -p seguridad-caos-exp4 -f $compose --profile tools run --rm generator --run-id $runId --scenario $Scenario --count $Count --interval-ms $IntervalMs --seq-start $SeqStart
  if ($LASTEXITCODE -ne 0) { throw "generator failed" }
}
function Invoke-BackupOnce {
  Assert-NoStop
  if (-not (Test-WatchdogHealthy)) { throw "watchdog unhealthy - cancelling" }
  docker compose -p seguridad-caos-exp4 -f $compose --profile tools run --rm backup --run-id $runId --scenario $Scenario --once
  if ($LASTEXITCODE -ne 0) { throw "backup failed" }
}

Invoke-Gen -Count $Initial -SeqStart 1
Invoke-BackupOnce
$backupAfterInitial = Get-ChildItem (Get-LabBackupsDir) -Filter "backup-*.meta.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

Invoke-Gen -Count $Mid -SeqStart ($Initial + 1)

if ($Scenario -eq "r1") {
  Invoke-BackupOnce
}

Invoke-Gen -Count $Final -SeqStart ($Initial + $Mid + 1)

if ($Scenario -eq "r0") {
  $restoreMeta = $backupAfterInitial
} else {
  $restoreMeta = Get-ChildItem (Get-LabBackupsDir) -Filter "backup-*.meta.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}
if (-not $restoreMeta) { throw "no backup meta found" }
$backupId = (Get-Content -Raw $restoreMeta.FullName | ConvertFrom-Json).backup_id
Write-Host "RESTORE_BACKUP_ID=$backupId"

docker compose -p seguridad-caos-exp4 -f $compose --profile tools run --rm -e RESTORE_ENTRYPOINT=fault.py restore --run-id $runId --scenario $Scenario --wipe-commits --authorized
if ($LASTEXITCODE -ne 0) { throw "fault failed" }

$minCommits = if ($Scenario -eq "r0") { $Initial } else { ($Initial + $Mid) }

if ($Scenario -eq "r0") {
  $req = Join-Path (Get-LabEventsDir) "R0_MANUAL_RESTORE_REQUIRED.json"
  $done = Join-Path (Get-LabEventsDir) "R0_MANUAL_RESTORE_DONE.json"
  Remove-Item $done -ErrorAction SilentlyContinue
  $utf8 = New-Object System.Text.UTF8Encoding $false
  $reqObj = [ordered]@{
    project     = "seguridad-caos-exp4"
    run_id      = $runId
    backup_id   = $backupId
    scenario    = "r0"
    instruction = (".\scripts\restore-manual-r0.ps1 -RunId {0} -BackupId {1} -Authorized" -f $runId, $backupId)
  }
  [System.IO.File]::WriteAllText($req, ($reqObj | ConvertTo-Json), $utf8)
  Add-LabEvent -EventType "manual_restore_waiting" -RunId $runId -Scenario r0 -Extra @{ backup_id = $backupId }

  Write-Host "R0_WAITING_FOR_MANUAL_RESTORE backup_id=$backupId"
  Write-Host ("OPERATOR_ACTION: .\scripts\restore-manual-r0.ps1 -RunId {0} -BackupId {1} -Authorized" -f $runId, $backupId)

  $waitDeadline = (Get-Date).ToUniversalTime().AddMinutes($MaxMinutes)
  while ($true) {
    if (Test-Path (Join-Path (Get-LabEventsDir) "STOP")) {
      throw "STOP during manual wait - aborting safely"
    }
    if (-not (Test-WatchdogHealthy)) {
      throw "watchdog unhealthy during manual wait - aborting"
    }
    if ((Get-Date).ToUniversalTime() -gt $waitDeadline) {
      Add-LabEvent -EventType "manual_restore_timeout" -RunId $runId -Scenario r0 -Extra @{ backup_id = $backupId }
      throw "manual restore not completed before MaxMinutes - safe abort"
    }
    if (Test-Path $done) { break }
    $evPath = Join-Path (Get-LabEventsDir) "events.jsonl"
    if (Test-Path $evPath) {
      $content = Get-Content -Raw $evPath
      if ($content -match ('"event_type":\s*"restore_completed"') -and $content -match ([regex]::Escape($runId))) {
        # weak but sufficient with DONE file preferred
        if ($content -match ('"run_id":\s*"' + [regex]::Escape($runId) + '"[\s\S]{0,400}"event_type":\s*"restore_completed"') -or
            $content -match ('"event_type":\s*"restore_completed"[\s\S]{0,400}"run_id":\s*"' + [regex]::Escape($runId) + '"')) {
          break
        }
      }
    }
    Start-Sleep -Seconds 2
  }
  Write-Host "R0_MANUAL_RESTORE_DETECTED"
} else {
  Assert-NoStop
  docker compose -p seguridad-caos-exp4 -f $compose --profile tools run --rm restore --run-id $runId --scenario $Scenario --backup-id $backupId --mode auto --authorized
  if ($LASTEXITCODE -ne 0) { throw "auto restore failed" }
}

$probeOk = $false
for ($i = 0; $i -lt 30; $i++) {
  Assert-NoStop
  docker compose -p seguridad-caos-exp4 -f $compose --profile tools run --rm probe --run-id $runId --scenario $Scenario --interval-sec 1 --min-commits $minCommits --once
  if ($LASTEXITCODE -eq 0) { $probeOk = $true; break }
  Start-Sleep -Seconds 1
}
if (-not $probeOk) { throw "service probe did not become OK" }

$outDir = Join-Path (Get-LabRoot) ("evidencias-publicas\{0}\{1}" -f $Scenario, $runId)
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$events = Join-Path (Get-LabEventsDir) "events.jsonl"
$alerts = Join-Path (Get-LabEventsDir) "alerts.jsonl"
py -3 (Join-Path (Get-LabRoot) "scripts\compute-metrics.py") --events $events --alerts $alerts --run-id $runId --scenario $Scenario --out (Join-Path $outDir "metrics.json") --backup-interval-sec $intervalObj --probe-interval-sec 1

Copy-Item $events (Join-Path $outDir "events.jsonl") -ErrorAction SilentlyContinue
Copy-Item $alerts (Join-Path $outDir "alerts.jsonl") -ErrorAction SilentlyContinue
Copy-Item $restoreMeta.FullName (Join-Path $outDir "backup.meta.json") -ErrorAction SilentlyContinue

$env:EXP4_ALLOW_COMPOSE_STOP = "1"
& (Join-Path $PSScriptRoot "stop-experiment.ps1") -Reason ("end_of_{0}" -f $Scenario)
Write-Host "SCENARIO_DONE run_id=$runId out=$outDir"
