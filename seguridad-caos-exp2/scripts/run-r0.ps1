# Procedimiento R0 reproducible. Requiere -Authorized. NO ejecutar en Fase 2 de corrección.
param(
  [switch]$Authorized,
  [int]$MaxMinutes = 30
)

$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "run-scenario.ps1") -Scenario r0 -Authorized:$Authorized -MaxMinutes $MaxMinutes
exit $LASTEXITCODE
