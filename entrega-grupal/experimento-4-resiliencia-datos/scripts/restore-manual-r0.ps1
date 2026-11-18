# Restauracion manual R0 (H1): registra inicio real del operador y luego restaura.
param(
  [Parameter(Mandatory = $true)][string]$RunId,
  [Parameter(Mandatory = $true)][string]$BackupId,
  [switch]$Authorized
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lab-common.ps1")
Assert-LabComposeProject
Write-Host "CHECKLIST_R0_MANUAL_RESTORE"
Write-Host "1. Confirm project=seguridad-caos-exp4"
Write-Host "2. Confirm database=lab_resilience_db"
Write-Host "3. Confirm host allowlist 172.31.10.10"
Write-Host "4. Confirm backup sha256 meta matches dump"
Write-Host "5. Confirm STOP absent / watchdog healthy"
Write-Host "6. Only then pass -Authorized"

$req = Join-Path (Get-LabEventsDir) "R0_MANUAL_RESTORE_REQUIRED.json"
if (-not (Test-Path $req)) {
  Write-Host "WARN: R0_MANUAL_RESTORE_REQUIRED.json missing - ensure runner is waiting"
}

if (-not $Authorized) {
  Write-Host "REFUSED: manual restore not authorized yet"
  exit 2
}
if ($env:EXP4_ALLOW_COMPOSE -ne "1") {
  Write-Host "REFUSED: EXP4_ALLOW_COMPOSE!=1"
  exit 2
}
Assert-NoStop
if (-not (Test-WatchdogHealthy)) {
  throw "watchdog unhealthy - refusing manual restore"
}

# H1: instante real de inicio de recuperacion por el operador
Add-LabEvent -EventType "operator_restore_authorized" -RunId $RunId -Scenario r0 -Extra @{
  backup_id = $BackupId
  t_restore_inicio = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  mode = "manual"
}

$compose = Get-LabComposeFile
docker compose -p seguridad-caos-exp4 -f $compose --profile tools run --rm restore --run-id $RunId --scenario r0 --backup-id $BackupId --mode manual --authorized
if ($LASTEXITCODE -ne 0) { throw "manual restore failed" }

$done = Join-Path (Get-LabEventsDir) "R0_MANUAL_RESTORE_DONE.json"
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($done, (@{ run_id = $RunId; backup_id = $BackupId; utc = (Get-Date).ToUniversalTime().ToString("o") } | ConvertTo-Json), $utf8)
Write-Host "R0_MANUAL_RESTORE_DONE=$done"
