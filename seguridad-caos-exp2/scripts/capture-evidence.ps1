# Captura evidencias con timestamp UTC. No inventa métricas temporales.
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("r0", "r1", "baseline", "stop")]
  [string]$Label,
  [string]$RunId = ""
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lab-common.ps1")

Assert-LabProjectName
Initialize-LabRuntimeDirs

$Stamp = if ($RunId) { $RunId } else { (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ") }
$OutDir = Join-Path (Join-Path (Join-Path (Get-LabRoot) "evidencias") $Label) $Stamp
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$Meta = @{
  label = $Label
  run_id = $RunId
  captured_utc = (Get-Date).ToUniversalTime().ToString("o")
  project = "seguridad-caos-exp2"
  stop_flag_present = (Test-LabStopRequested)
  note = "Evidencia estructural; MTTD/MTTC solo desde compute-metrics con run_id"
} | ConvertTo-Json

Set-Content -Path (Join-Path $OutDir "meta.json") -Value $Meta -Encoding utf8
Copy-Item (Join-Path (Get-LabRoot) "policy\active.yaml") (Join-Path $OutDir "active-policy.yaml") -ErrorAction SilentlyContinue
Copy-Item (Join-Path (Get-LabEventsDir) "events.jsonl") (Join-Path $OutDir "events.jsonl") -ErrorAction SilentlyContinue
Copy-Item (Join-Path (Get-LabEventsDir) "alerts.jsonl") (Join-Path $OutDir "alerts.jsonl") -ErrorAction SilentlyContinue
Copy-Item (Join-Path (Get-LabEventsDir) "run_context.json") (Join-Path $OutDir "run_context.json") -ErrorAction SilentlyContinue
if (Test-Path (Get-LabEvidenceDir)) {
  Copy-Item -Recurse -Force (Get-LabEvidenceDir) (Join-Path $OutDir "probes") -ErrorAction SilentlyContinue
}

Write-Host ("EVIDENCE_DIR={0}" -f $OutDir)
