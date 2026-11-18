# Funciones compartidas - seguridad-caos-exp4 (solo este proyecto).
$ErrorActionPreference = "Stop"
$script:LabProject = "seguridad-caos-exp4"

function Get-LabRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-RepoRoot {
  # Nunca saltar tres niveles relativos (../../..): falla fuera del repo.
  # git -C desde la raíz del lab sube hasta el toplevel real.

  $lab = Get-LabRoot
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $out = & git -C $lab rev-parse --show-toplevel 2>&1
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  if ($code -ne 0) {
    throw ("GIT_REPO_ROOT_UNRESOLVED exit={0} out={1}" -f $code, ($out | Out-String).Trim())
  }
  $toplevel = ($out | Select-Object -Last 1).ToString().Trim()
  if (-not $toplevel) { throw "GIT_REPO_ROOT_EMPTY" }
  return (Resolve-Path $toplevel).Path
}

function Invoke-LabGit {
  param(
    [Parameter(Mandatory = $true)][string[]]$GitArgs,
    [string]$OutFile = $null
  )
  $repo = Get-RepoRoot
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $out = & git -C $repo @GitArgs 2>&1
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  $text = ($out | ForEach-Object { "$_" }) -join [Environment]::NewLine
  if ($OutFile) {
    $dir = Split-Path -Parent $OutFile
    if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($OutFile, ("repo={0}{1}exit={2}{1}{3}{1}" -f $repo, [Environment]::NewLine, $code, $text), $utf8)
  }
  Write-Host ("GIT_C repo={0} exit={1} args={2}" -f $repo, $code, ($GitArgs -join " "))
  if ($text) { Write-Host $text }
  return $code
}

function Write-LabGitEvidence {
  param(
    [Parameter(Mandatory = $true)][string]$OutFile
  )
  $repo = Get-RepoRoot
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add(("repo_root={0}" -f $repo))
  $lines.Add(("lab_root={0}" -f (Get-LabRoot)))
  foreach ($args in @(
      @("rev-parse", "HEAD"),
      @("rev-parse", "main^{commit}"),
      @("rev-parse", "v1.2.0^{commit}"),
      @("status", "-sb"),
      @("status", "--short")
    )) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $out = & git -C $repo @args 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    $lines.Add(("cmd=git -C <repo> {0}" -f ($args -join " ")))
    $lines.Add(("exit={0}" -f $code))
    $lines.Add((($out | ForEach-Object { "$_" }) -join [Environment]::NewLine))
    if ($code -ne 0) {
      $utf8 = New-Object System.Text.UTF8Encoding $false
      [System.IO.File]::WriteAllText($OutFile, ($lines -join [Environment]::NewLine), $utf8)
      throw ("GIT_EVIDENCE_FAIL cmd={0} exit={1}" -f ($args -join " "), $code)
    }
  }
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($OutFile, ($lines -join [Environment]::NewLine), $utf8)
  Write-Host ("GIT_EVIDENCE_OK file={0}" -f $OutFile)
}

function Get-LabComposeFile {
  return (Join-Path (Get-LabRoot) "docker-compose.yml")
}

function Get-LabEventsDir {
  return (Join-Path (Join-Path (Get-LabRoot) "runtime") "events")
}

function Get-LabBackupsDir {
  return (Join-Path (Join-Path (Get-LabRoot) "runtime") "backups")
}

function Get-LabEvidenceDir {
  return (Join-Path (Join-Path (Get-LabRoot) "runtime") "evidence")
}

function Assert-LabComposeProject {
  $compose = Get-Content -Raw (Get-LabComposeFile)
  if ($compose -notmatch '(?m)^name:\s*seguridad-caos-exp4\s*$') {
    throw "Compose project name must be seguridad-caos-exp4"
  }
  if ($compose -match '(?m)^\s*ports\s*:') {
    throw "REFUSED: compose must not publish ports to host"
  }
}

function Initialize-LabRuntime {
  $events = Get-LabEventsDir
  $backups = Get-LabBackupsDir
  $evidence = Get-LabEvidenceDir
  New-Item -ItemType Directory -Force -Path $events, $backups, $evidence | Out-Null
  Set-Content -Path (Join-Path $events ".writable_by_lab") -Value "ok" -Encoding utf8
  Set-Content -Path (Join-Path $backups ".writable_by_lab") -Value "ok" -Encoding utf8
  Set-Content -Path (Join-Path $evidence ".writable_by_lab") -Value "ok" -Encoding utf8
}

function Test-WatchdogHealthy {
  $hb = Join-Path (Get-LabEventsDir) "watchdog_heartbeat.json"
  if (-not (Test-Path $hb)) { return $false }
  try {
    $j = Get-Content -Raw $hb | ConvertFrom-Json
    return [bool]$j.healthy
  } catch {
    return $false
  }
}

function Assert-NoStop {
  if (Test-Path (Join-Path (Get-LabEventsDir) "STOP")) {
    throw "STOP present - refusing experimental action"
  }
}

function Write-LabDeadline {
  param(
    [Parameter(Mandatory = $true)][string]$RunId,
    [Parameter(Mandatory = $true)][int]$MaxMinutes
  )
  $deadline = (Get-Date).ToUniversalTime().AddMinutes($MaxMinutes).ToString("o")
  $obj = [ordered]@{
    project      = $script:LabProject
    run_id       = $RunId
    active       = $true
    deadline_utc = $deadline
  }
  $path = Join-Path (Get-LabEventsDir) "experiment_deadline.json"
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($path, ($obj | ConvertTo-Json), $utf8)
}

function New-LabRunId {
  param([ValidateSet("r0", "r1", "smoke")][string]$Scenario)
  $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
  return ("{0}-{1}" -f $Scenario, $stamp)
}

function Add-LabEvent {
  param(
    [Parameter(Mandatory = $true)][string]$EventType,
    [Parameter(Mandatory = $true)][string]$RunId,
    [Parameter(Mandatory = $true)][string]$Scenario,
    [hashtable]$Extra = @{}
  )
  $obj = [ordered]@{
    timestamp_utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    project       = $script:LabProject
    event_type    = $EventType
    run_id        = $RunId
    scenario      = $Scenario
  }
  foreach ($k in $Extra.Keys) { $obj[$k] = $Extra[$k] }
  $path = Join-Path (Get-LabEventsDir) "events.jsonl"
  $line = ($obj | ConvertTo-Json -Compress)
  Add-Content -Path $path -Value $line -Encoding utf8
}

function Get-LabWritePlan {
  # Must stay identical for R0 and R1 (H2)
  return [ordered]@{
    initial_commits = 10
    mid_commits     = 3
    final_commits   = 3
    interval_ms     = 250
    total           = 16
  }
}
