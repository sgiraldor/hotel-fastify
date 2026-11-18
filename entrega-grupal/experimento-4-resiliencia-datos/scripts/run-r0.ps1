param(
  [switch]$Authorized,
  [int]$MaxMinutes = 30
)
& (Join-Path $PSScriptRoot "run-scenario.ps1") -Scenario r0 -Authorized:$Authorized -MaxMinutes $MaxMinutes
