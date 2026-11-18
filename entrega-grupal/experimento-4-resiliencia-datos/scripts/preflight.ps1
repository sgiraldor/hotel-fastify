# Preflight estático / semántico (no levanta el experimento).
param([switch]$CheckDockerConfig)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lab-common.ps1")
Assert-LabComposeProject
Initialize-LabRuntime
$root = Get-LabRoot
$repo = Get-RepoRoot
Write-Host "PROJECT=seguridad-caos-exp4"
Write-Host "ROOT=$root"
Write-Host "REPO_ROOT=$repo"
Write-Host "COMPOSE=$(Get-LabComposeFile)"

# Forbidden path patterns in compose
$compose = Get-Content -Raw (Get-LabComposeFile)
if ($compose -match 'hotel-mysql|hotel-oke|/var/run/docker\.sock') {
  throw "REFUSED: compose references protected DevOps resources or Docker socket mount"
}
Write-Host "COMPOSE_SAFE=True"

if ($CheckDockerConfig) {
  docker compose -p seguridad-caos-exp4 -f (Get-LabComposeFile) config 1>$null
  if ($LASTEXITCODE -ne 0) { throw "docker compose config failed" }
  Write-Host "COMPOSE_CONFIG_OK=True"
}
Write-Host "PREFLIGHT_OK"
