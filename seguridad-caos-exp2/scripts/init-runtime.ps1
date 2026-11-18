# Prepara directorios de runtime del laboratorio (bind mounts). No crea contenedores.
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lab-common.ps1")
Assert-LabProjectName
Initialize-LabRuntimeDirs
Write-Host ("RUNTIME_EVENTS={0}" -f (Get-LabEventsDir))
Write-Host ("RUNTIME_EVIDENCE={0}" -f (Get-LabEvidenceDir))
Write-Host ("STOP_PATH={0}" -f (Get-LabStopPath))
