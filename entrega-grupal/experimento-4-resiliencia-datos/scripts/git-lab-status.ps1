# Estado Git del repo hotel-fastify usando git -C (nunca Push-Location relativo).
param(
  [string]$OutFile = ""
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lab-common.ps1")
Assert-LabComposeProject
if (-not $OutFile) {
  $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
  $OutFile = Join-Path (Get-LabRoot) ("evidencias\git-status-{0}.txt" -f $stamp)
}
Write-LabGitEvidence -OutFile $OutFile
Write-Host "GIT_STATUS_PASS out=$OutFile"
exit 0
