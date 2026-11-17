# Prueba complementaria B: Baseline / R0 / R1 con latencia MySQL (Toxiproxy).
# Conserva intacto el experimento A (503). No toca OCI.
param(
  [string]$BaseUrl = 'http://127.0.0.1:3000',
  [string]$Token = $env:CHAOS_LAB_TOKEN,
  [int]$LatencyMs = 2500
)

$ErrorActionPreference = 'Stop'
$k6 = 'C:\Program Files\k6\k6.exe'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root
New-Item -ItemType Directory -Force -Path scripts\experiments\results | Out-Null
$ev = 'evidencias\seguimiento-4-local'
New-Item -ItemType Directory -Force -Path $ev | Out-Null

if (-not $Token) { $Token = 'lab-local-seguimiento4' }
$env:CHAOS_LAB_TOKEN = $Token

# Hipótesis declarada ANTES de ejecutar (también en evidencias)
$hypothesis = @{
  experiment = 'B_MYSQL_DEGRADE_COMPLEMENTARY'
  declared_before_run = $true
  declared_at = (Get-Date).ToUniversalTime().ToString('o')
  primary_metric = 'http_req_duration p95 bajo latencia MySQL artificial'
  secondary_metrics = @(
    'hotel_success_rate',
    'hotel_status_504 (fail-fast)',
    'hotel_status_503 (bulkhead)',
    'patterns.fail_fast_timeouts / bulkhead_rejections en /metrics',
    'throughput exitoso (status 200 / tiempo)'
  )
  hypothesis = 'Bajo latencia MySQL ~2500ms, R1(protected) activa fail-fast/bulkhead y reduce p95 vs R0(unprotected), que completa 200 con p95 alto. No mejora el experimento A de 503 total.'
  fault = "Toxiproxy latency=${LatencyMs}ms en path API->MySQL"
  profile = 'LOCAL_MYSQL_DEGRADE_K6_V8_60S'
  same_for_r0_r1 = $true
}
$hypothesis | ConvertTo-Json -Depth 5 | Set-Content "$ev\50-hypothesis-mysql-degrade.json" -Encoding utf8
Write-Host 'Hipótesis declarada en 50-hypothesis-mysql-degrade.json'

function Restart-Api([string]$Mode) {
  Write-Host "Reiniciando api RESILIENCE_MODE=$Mode (compose degrade)"
  $env:RESILIENCE_MODE = $Mode
  $env:CHAOS_LAB_TOKEN = $Token
  docker compose -f docker-compose.yml -f docker-compose.degrade.yml up -d --build api 2>&1 | Out-Host
  $deadline = (Get-Date).AddMinutes(5)
  do {
    Start-Sleep 3
    try {
      if ((Invoke-WebRequest "$BaseUrl/ready" -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200) { break }
    } catch {}
  } while ((Get-Date) -lt $deadline)
  $m = Invoke-RestMethod "$BaseUrl/metrics"
  Write-Host "ready mode=$($m.resilience_mode) pool=$($m.db.poolLimit) qTimeout=$($m.db.queryTimeoutMs)"
  if ($m.resilience_mode -ne $Mode) { throw "Modo esperado $Mode" }
}

function Invoke-K6([string]$Round) {
  Write-Host "=== k6 MYSQL DEGRADE $Round ==="
  & $k6 run -e "HOTEL_BASE_URL=$BaseUrl" -e "HABITACION_ID=1" -e "ROUND=$Round" `
    scripts\experiments\k6-mysql-degrade-profile.js
  Copy-Item "scripts\experiments\results\k6-mysql-$Round-summary.json" "$ev\50-k6-mysql-$Round-summary.json" -Force
}

function Snapshot-Metrics([string]$Label) {
  $m = Invoke-RestMethod "$BaseUrl/metrics"
  $m | ConvertTo-Json -Depth 6 | Set-Content "$ev\50-metrics-$Label.json" -Encoding utf8
}

function Measure-Recovery {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $ok = $false
  for ($i = 0; $i -lt 30; $i++) {
    try {
      $r = Invoke-WebRequest "$BaseUrl/api/v2/habitacion/1" -UseBasicParsing -TimeoutSec 5
      if ($r.StatusCode -eq 200 -and $r.Headers['x-trace-id']) {
        $ok = $true
        break
      }
    } catch {}
    Start-Sleep -Milliseconds 500
  }
  $sw.Stop()
  return @{ recovered = $ok; recovery_ms = $sw.ElapsedMilliseconds }
}

# Setup toxiproxy proxy (sin latencia)
& "$PSScriptRoot\mysql-latency.ps1" -Action setup

# Baseline: protected, sin latencia
Restart-Api 'protected'
& "$PSScriptRoot\mysql-latency.ps1" -Action disable
Snapshot-Metrics 'before-baseline'
Invoke-K6 'baseline'
Snapshot-Metrics 'after-baseline'

# R0: unprotected + latencia
Restart-Api 'unprotected'
& "$PSScriptRoot\mysql-latency.ps1" -Action enable -LatencyMs $LatencyMs
Start-Sleep 2
Snapshot-Metrics 'before-r0'
Invoke-K6 'r0'
Snapshot-Metrics 'after-r0'

# R1: protected + misma latencia
Restart-Api 'protected'
& "$PSScriptRoot\mysql-latency.ps1" -Action enable -LatencyMs $LatencyMs
Start-Sleep 2
Snapshot-Metrics 'before-r1'
Invoke-K6 'r1'
Snapshot-Metrics 'after-r1'

# Recuperación: quitar latencia
& "$PSScriptRoot\mysql-latency.ps1" -Action disable
$rec = Measure-Recovery
$rec | ConvertTo-Json | Set-Content "$ev\50-recovery.json" -Encoding utf8
Write-Host "Recuperacion: $($rec | ConvertTo-Json -Compress)"
Write-Host 'Rondas MySQL degrade completadas'
