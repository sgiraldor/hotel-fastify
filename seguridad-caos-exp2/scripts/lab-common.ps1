# Funciones compartidas del laboratorio seguridad-caos-exp2 (solo este proyecto).

$script:LabProject = "seguridad-caos-exp2"

function Get-LabRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-LabComposeFile {
  return (Join-Path (Get-LabRoot) "docker-compose.yml")
}

function Get-LabEventsDir {
  return (Join-Path (Get-LabRoot) "runtime\events")
}

function Get-LabEvidenceDir {
  return (Join-Path (Get-LabRoot) "runtime\evidence")
}

function Get-LabStopPath {
  return (Join-Path (Get-LabEventsDir) "STOP")
}

function Get-LabAbortPath {
  return (Join-Path (Get-LabEventsDir) "ABORT_PROBES")
}

function Get-LabDeadlinePath {
  return (Join-Path (Get-LabEventsDir) "experiment_deadline.json")
}

function Get-LabHeartbeatPath {
  return (Join-Path (Get-LabEventsDir) "watchdog_heartbeat.json")
}

function Write-LabJsonFile {
  param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)]$Object
  )
  # UTF-8 sin BOM (evita run_context/deadline ilegibles en contenedores).
  $json = $Object | ConvertTo-Json -Depth 8
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($Path, $json + "`n", $utf8)
}

function Initialize-LabRuntimeDirs {
  $events = Get-LabEventsDir
  $evidence = Get-LabEvidenceDir
  New-Item -ItemType Directory -Force -Path $events | Out-Null
  New-Item -ItemType Directory -Force -Path $evidence | Out-Null
  $aclNote = Join-Path $events ".writable_by_lab"
  if (-not (Test-Path $aclNote)) {
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($aclNote, "labuid=10001`n", $utf8)
  }
  $evNote = Join-Path $evidence ".writable_by_lab"
  if (-not (Test-Path $evNote)) {
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($evNote, "labuid=10001`n", $utf8)
  }
}

function Assert-LabProjectName {
  param([string]$Expected = "seguridad-caos-exp2")
  if ($Expected -ne $script:LabProject) {
    throw "Proyecto Docker no autorizado: $Expected"
  }
  $compose = Get-Content (Get-LabComposeFile) -Raw
  if ($compose -notmatch '(?m)^name:\s*seguridad-caos-exp2\s*$') {
    throw "docker-compose.yml no declara name: seguridad-caos-exp2"
  }
}

function Test-LabStopRequested {
  return ((Test-Path (Get-LabStopPath)) -or (Test-Path (Get-LabAbortPath)))
}

function Set-LabRunContext {
  param(
    [Parameter(Mandatory)][string]$RunId,
    [Parameter(Mandatory)][ValidateSet("r0", "r1", "smoke")][string]$Scenario,
    [Parameter(Mandatory)][string]$PolicyId
  )
  Initialize-LabRuntimeDirs
  Write-LabJsonFile -Path (Join-Path (Get-LabEventsDir) "run_context.json") -Object ([ordered]@{
    run_id = $RunId
    scenario = $Scenario
    policy_id = $PolicyId
    written_utc = (Get-Date).ToUniversalTime().ToString("o")
  })
}

function Set-LabExperimentDeadline {
  param(
    [Parameter(Mandatory)][string]$RunId,
    [Parameter(Mandatory)][ValidateSet("r0", "r1", "smoke")][string]$Scenario,
    [Parameter(Mandatory)][int]$MaxMinutes,
    [datetime]$DeadlineUtc = [datetime]::MinValue
  )
  Initialize-LabRuntimeDirs
  if ($MaxMinutes -lt 1) { throw "MaxMinutes debe ser >= 1" }
  $created = (Get-Date).ToUniversalTime()
  if ($DeadlineUtc -eq [datetime]::MinValue) {
    $DeadlineUtc = $created.AddMinutes($MaxMinutes)
  }
  # No sobrescribir deadline_utc si ya existe el mismo run_id activo — conservación en reinicios del watchdog.
  $path = Get-LabDeadlinePath
  if (Test-Path $path) {
    try {
      $existing = Get-Content $path -Raw | ConvertFrom-Json
      if ($existing.run_id -eq $RunId -and $existing.deadline_utc) {
        Write-Host ("DEADLINE_PRESERVED run_id={0} deadline_utc={1}" -f $RunId, $existing.deadline_utc)
        # Reactivar si hacía falta, sin cambiar el plazo.
        Write-LabJsonFile -Path $path -Object ([ordered]@{
          run_id = $existing.run_id
          scenario = $Scenario
          max_minutes = $existing.max_minutes
          created_utc = $existing.created_utc
          deadline_utc = $existing.deadline_utc
          active = $true
          project = "seguridad-caos-exp2"
        })
        return $existing.deadline_utc
      }
    } catch {
      # Continuar con escritura nueva
    }
  }
  $deadlineIso = $DeadlineUtc.ToUniversalTime().ToString("o")
  Write-LabJsonFile -Path $path -Object ([ordered]@{
    run_id = $RunId
    scenario = $Scenario
    max_minutes = $MaxMinutes
    created_utc = $created.ToString("o")
    deadline_utc = $deadlineIso
    active = $true
    project = "seguridad-caos-exp2"
  })
  return $deadlineIso
}

function Clear-LabExperimentDeadline {
  $path = Get-LabDeadlinePath
  if (Test-Path $path) {
    try {
      $existing = Get-Content $path -Raw | ConvertFrom-Json
      Write-LabJsonFile -Path $path -Object ([ordered]@{
        run_id = $existing.run_id
        scenario = $existing.scenario
        max_minutes = $existing.max_minutes
        created_utc = $existing.created_utc
        deadline_utc = $existing.deadline_utc
        active = $false
        deactivated_utc = (Get-Date).ToUniversalTime().ToString("o")
        deactivate_reason = "runner_cleanup"
        project = "seguridad-caos-exp2"
      })
    } catch {
      Remove-Item -Force $path -ErrorAction SilentlyContinue
    }
  }
}

function Clear-LabStopFlag {
  foreach ($p in @((Get-LabStopPath), (Get-LabAbortPath))) {
    if (Test-Path $p) { Remove-Item -Force $p }
  }
}

function Write-LabStopFlag {
  param([string]$Reason = "manual")
  Initialize-LabRuntimeDirs
  $utc = (Get-Date).ToUniversalTime().ToString("o")
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText((Get-LabStopPath), ("stopped_at_utc={0}`nreason={1}`nproject=seguridad-caos-exp2`n" -f $utc, $Reason), $utf8)
  Write-LabJsonFile -Path (Get-LabAbortPath) -Object ([ordered]@{
    abort = $true
    reason = $Reason
    timestamp_utc = $utc
  })
}

function Test-LabWatchdogHealthy {
  param([int]$MaxAgeSeconds = 10)
  # 1) Contenedor running del proyecto
  $status = docker inspect -f "{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}" seguridad-caos-exp2-watchdog 2>$null
  if (-not $status -or ($status -notmatch '^running')) {
    return [pscustomobject]@{ Healthy = $false; Reason = "container_not_running:$status" }
  }
  # 2) Heartbeat fresco en bind mount
  $hb = Get-LabHeartbeatPath
  if (-not (Test-Path $hb)) {
    return [pscustomobject]@{ Healthy = $false; Reason = "heartbeat_missing" }
  }
  $age = ([datetime]::UtcNow - (Get-Item $hb).LastWriteTimeUtc).TotalSeconds
  if ($age -gt $MaxAgeSeconds) {
    return [pscustomobject]@{ Healthy = $false; Reason = ("heartbeat_stale_age_sec=" + [int]$age) }
  }
  try {
    $data = Get-Content $hb -Raw | ConvertFrom-Json
    if (-not $data.healthy) {
      return [pscustomobject]@{ Healthy = $false; Reason = "heartbeat_healthy_false" }
    }
  } catch {
    return [pscustomobject]@{ Healthy = $false; Reason = "heartbeat_parse_error" }
  }
  return [pscustomobject]@{ Healthy = $true; Reason = "ok"; Status = $status; AgeSec = $age }
}

function Assert-LabWatchdogHealthyOrCancel {
  $h = Test-LabWatchdogHealthy
  if (-not $h.Healthy) {
    Write-LabStopFlag -Reason ("watchdog_unhealthy:" + $h.Reason)
    throw ("Watchdog no operativo - experimento cancelado: " + $h.Reason)
  }
}

function Invoke-LabCompose {
  param(
    [Parameter(Mandatory)][string[]]$ComposeArgs
  )
  Assert-LabProjectName
  $file = Get-LabComposeFile
  # Docker Desktop escribe progreso a stderr; capturar sin tratarlo como error terminante.
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = & docker compose -p $script:LabProject -f $file @ComposeArgs 2>&1
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  $output | ForEach-Object { Write-Host $_ }
  if ($code -ne 0) {
    throw ("docker compose fallo (exit={0}) args={1}" -f $code, ($ComposeArgs -join ' '))
  }
}

function Invoke-LabProbe {
  param(
    [Parameter(Mandatory)][ValidateSet("client-unauthorized", "client-legitimate")][string]$Service
  )
  # Las sondas devuelven 0=path open, 1=blocked/fail, 2=aborted por STOP.
  # Esos codigos son evidencia del experimento; no deben abortar el runner.
  Assert-LabProjectName
  $file = Get-LabComposeFile
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = & docker compose -p $script:LabProject -f $file --profile manual run --rm --build $Service 2>&1
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  $output | ForEach-Object { Write-Host $_ }
  Write-Host ("PROBE_EXIT service={0} code={1}" -f $Service, $code)
  if ($code -notin 0, 1, 2) {
    throw ("Probe infraestructura fallo service={0} exit={1}" -f $Service, $code)
  }
  return $code
}

function Get-LabRunningContainerNames {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $names = @(docker ps --filter "label=experimento=seguridad-caos-exp2" --format "{{.Names}}" 2>$null)
  $ErrorActionPreference = $prev
  return @($names | Where-Object { $_ -and $_.Trim() -ne "" })
}

function Assert-LabContainersStopped {
  param([int]$Retries = 10, [int]$DelaySeconds = 1)
  for ($i = 0; $i -lt $Retries; $i++) {
    $running = Get-LabRunningContainerNames
    if ($running.Count -eq 0) {
      Write-Host "LAB_RUNNING_CONTAINERS=0"
      return $true
    }
    Start-Sleep -Seconds $DelaySeconds
  }
  $running = Get-LabRunningContainerNames
  throw ("Rollback inseguro: contenedores lab aun running: {0}" -f ($running -join ","))
}

# Compat: jobs PS ya no son el TTL primario; se mantienen como respaldo opcional desactivado por defecto.
function Start-LabTtlGuard {
  param([int]$MaxMinutes, [string]$RunId)
  Write-Warning "Start-LabTtlGuard (PS job) esta deprecado; usar watchdog Docker + Set-LabExperimentDeadline"
  return $null
}

function Stop-LabTtlGuard {
  param([string]$RunId)
}
