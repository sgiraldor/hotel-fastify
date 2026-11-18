# Aplica política R0 o R1 al archivo active.yaml montado en el gateway.
# Uso: .\scripts\apply-policy.ps1 -Scenario r0|r1
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("r0", "r1")]
  [string]$Scenario
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$PolicyDir = Join-Path $Root "policy"
$Active = Join-Path $PolicyDir "active.yaml"

if ($Scenario -eq "r0") {
  Copy-Item -Force (Join-Path $PolicyDir "r0-permissive.yaml") $Active
} else {
  Copy-Item -Force (Join-Path $PolicyDir "r1-restrictive.yaml") $Active
}

Write-Host ("POLICY_APPLIED={0} utc={1}" -f $Scenario, (Get-Date).ToUniversalTime().ToString("o"))
Get-Content $Active | Select-Object -First 8
