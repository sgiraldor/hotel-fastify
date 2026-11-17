# Experimento C: bulkhead bajo alta concurrencia (Toxiproxy + k6).
# R0 = unprotected (sin bulkhead efectivo). R1 = protected (concurrencyLimit=4).
# Misma carga, latencia y duración. No toca evidencias A/B ni OCI.
param(
  [string]$BaseUrl = 'http://127.0.0.1:3000',
  [string]$Token = $env:CHAOS_LAB_TOKEN,
  [int]$LatencyMs = 3000
)

$ErrorActionPreference = 'Continue'
$k6 = 'C:\Program Files\k6\k6.exe'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root
New-Item -ItemType Directory -Force -Path scripts\experiments\results, evidencias\seguimiento-4-local | Out-Null
$ev = 'evidencias\seguimiento-4-local'
if (-not $Token) { $Token = 'lab-local-seguimiento4' }
$env:CHAOS_LAB_TOKEN = $Token

# --- Hipótesis ANTES de ejecutar ---
$hypothesis = [ordered]@{
  experiment = 'C_BULKHEAD_HIGH_CONCURRENCY'
  declared_before_run = $true
  declared_at = (Get-Date).ToUniversalTime().ToString('o')
  hypothesis = 'Con latencia MySQL 3000ms y 24 VU, R1(protected, concurrencyLimit=4 < pool=10) produce bulkhead_rejections>0 y peak_inflight<=4; R0(unprotected) no rechaza por bulkhead y admite mayor inflight. Trade-off esperado: R1 baja success_rate a cambio de aislar la dependencia.'
  primary_metric = 'patterns.bulkhead_rejections (R1 > 0) y peak_inflight <= concurrencyLimit'
  threshold_pass_r1 = 'bulkhead_rejections >= 1 AND peak_inflight <= concurrencyLimit'
  threshold_pass_r0 = 'bulkhead_rejections == 0 (o despreciable) bajo la misma carga'
  abort_conditions = @(
    'API no ready tras 5 min',
    'Toxiproxy/proxy inaccesible',
    'k6 no instalado'
  )
  load = @{
    profile = 'LOCAL_BULKHEAD_K6_V24_50S'
    stages = @('5s->24VU', '40s hold 24VU', '5s->0')
    latency_ms = $LatencyMs
    endpoint = 'GET /api/v2/habitacion/1'
  }
  r0_config = @{ mode = 'unprotected'; pool = 50; concurrencyLimit = 50; queryTimeoutMs = 30000 }
  r1_config = @{ mode = 'protected'; pool = 10; concurrencyLimit = 4; queryTimeoutMs = 15000 }
  note = 'queryTimeout R1 elevado a 15s para que el rechazo por bulkhead sea observable frente al fail-fast; no se cuenta 503 como éxito.'
}
$hypothesis | ConvertTo-Json -Depth 6 | Set-Content "$ev\60-hypothesis-bulkhead.json" -Encoding utf8
Write-Host 'Hipótesis declarada: evidencias/seguimiento-4-local/60-hypothesis-bulkhead.json'

function Restart-Api([string]$Mode) {
  Write-Host "Boot API mode=$Mode (latencia OFF durante ready)"
  & "$PSScriptRoot\mysql-latency.ps1" -Action disable | Out-Host
  $env:RESILIENCE_MODE = $Mode
  $env:CHAOS_LAB_TOKEN = $Token
  if ($Mode -eq 'protected') {
    $env:DB_POOL_LIMIT = '10'
    $env:DB_CONCURRENCY_LIMIT = '4'
    $env:DB_QUERY_TIMEOUT_MS = '15000'
    $env:REQUEST_TIMEOUT_MS = '20000'
  } else {
    $env:DB_POOL_LIMIT_UNPROTECTED = '50'
    $env:DB_CONCURRENCY_LIMIT_UNPROTECTED = '50'
    $env:DB_QUERY_TIMEOUT_MS_UNPROTECTED = '30000'
    $env:REQUEST_TIMEOUT_MS_UNPROTECTED = '0'
    Remove-Item Env:DB_CONCURRENCY_LIMIT -ErrorAction SilentlyContinue
    Remove-Item Env:DB_POOL_LIMIT -ErrorAction SilentlyContinue
    Remove-Item Env:DB_QUERY_TIMEOUT_MS -ErrorAction SilentlyContinue
  }
  cmd /c "docker compose -f docker-compose.yml -f docker-compose.degrade.yml up -d --build --no-deps --force-recreate api" | Out-Host
  $ready = $false
  $deadline = (Get-Date).AddMinutes(5)
  do {
    Start-Sleep 3
    try {
      if ((Invoke-WebRequest "$BaseUrl/ready" -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {}
  } while ((Get-Date) -lt $deadline)
  if (-not $ready) { throw "API no ready ($Mode)" }
  $m = Invoke-RestMethod "$BaseUrl/metrics"
  Write-Host ("ready mode={0} pool={1} concurrency={2} qTimeout={3}" -f $m.resilience_mode, $m.db.poolLimit, $m.db.concurrencyLimit, $m.db.queryTimeoutMs)
  if ($m.resilience_mode -ne $Mode) { throw "modo esperado $Mode" }
  if ($Mode -eq 'protected' -and [int]$m.db.concurrencyLimit -ne 4) { throw 'concurrencyLimit protected != 4' }
  if ($Mode -eq 'protected' -and [int]$m.db.poolLimit -le [int]$m.db.concurrencyLimit) {
    Write-Host 'WARN: poolLimit deberia ser > concurrencyLimit para demostrar independencia'
  }
}

function Invoke-K6([string]$Round) {
  Write-Host "=== k6 BULKHEAD $Round ==="
  & $k6 run -e "HOTEL_BASE_URL=$BaseUrl" -e "HABITACION_ID=1" -e "ROUND=$Round" `
    scripts\experiments\k6-bulkhead-profile.js
  Copy-Item "scripts\experiments\results\k6-bulkhead-$Round-summary.json" "$ev\60-k6-bulkhead-$Round-summary.json" -Force
}

function Snapshot([string]$Label) {
  (Invoke-RestMethod "$BaseUrl/metrics") | ConvertTo-Json -Depth 6 |
    Set-Content "$ev\60-metrics-$Label.json" -Encoding utf8
}

function Poll-Inflight([string]$Round, [int]$Seconds = 35) {
  $samples = @()
  $end = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $end) {
    try {
      $m = Invoke-RestMethod "$BaseUrl/metrics"
      $samples += [pscustomobject]@{
        t = (Get-Date).ToUniversalTime().ToString('o')
        inflight = $m.patterns.inflight
        peak = $m.patterns.peak_inflight
        bulkhead = $m.patterns.bulkhead_rejections
        limit = $m.patterns.concurrency_limit
      }
    } catch {}
    Start-Sleep -Milliseconds 800
  }
  $samples | ConvertTo-Json -Depth 4 | Set-Content "$ev\60-inflight-samples-$Round.json" -Encoding utf8
}

function Measure-Recovery {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $ok = $false
  for ($i = 0; $i -lt 40; $i++) {
    try {
      $r = Invoke-WebRequest "$BaseUrl/api/v2/habitacion/1" -UseBasicParsing -TimeoutSec 5
      if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch {}
    Start-Sleep -Milliseconds 400
  }
  $sw.Stop()
  return @{ recovered = $ok; recovery_ms = $sw.ElapsedMilliseconds }
}

cmd /c "docker compose -f docker-compose.yml -f docker-compose.degrade.yml up -d toxiproxy" | Out-Host
Start-Sleep 2
& "$PSScriptRoot\mysql-latency.ps1" -Action setup | Out-Host

# R0
Restart-Api 'unprotected'
& "$PSScriptRoot\mysql-latency.ps1" -Action enable -LatencyMs $LatencyMs | Out-Host
Start-Sleep 2
Snapshot 'before-r0'
$job0 = Start-Job -ScriptBlock {
  param($root, $round, $secs)
  Set-Location $root
  $samples = @()
  $end = (Get-Date).AddSeconds($secs)
  while ((Get-Date) -lt $end) {
    try {
      $m = Invoke-RestMethod 'http://127.0.0.1:3000/metrics'
      $samples += @{ t = (Get-Date).ToUniversalTime().ToString('o'); inflight = $m.patterns.inflight; peak = $m.patterns.peak_inflight; bulkhead = $m.patterns.bulkhead_rejections; limit = $m.patterns.concurrency_limit }
    } catch {}
    Start-Sleep -Milliseconds 800
  }
  $samples
} -ArgumentList $root, 'r0', 45
Invoke-K6 'r0'
$samples0 = Receive-Job $job0 -Wait
$samples0 | ConvertTo-Json -Depth 5 | Set-Content "$ev\60-inflight-samples-r0.json" -Encoding utf8
Remove-Job $job0 -Force -ErrorAction SilentlyContinue
Snapshot 'after-r0'

# R1
Restart-Api 'protected'
& "$PSScriptRoot\mysql-latency.ps1" -Action enable -LatencyMs $LatencyMs | Out-Host
Start-Sleep 2
Snapshot 'before-r1'
$job1 = Start-Job -ScriptBlock {
  param($root, $secs)
  Set-Location $root
  $samples = @()
  $end = (Get-Date).AddSeconds($secs)
  while ((Get-Date) -lt $end) {
    try {
      $m = Invoke-RestMethod 'http://127.0.0.1:3000/metrics'
      $samples += @{ t = (Get-Date).ToUniversalTime().ToString('o'); inflight = $m.patterns.inflight; peak = $m.patterns.peak_inflight; bulkhead = $m.patterns.bulkhead_rejections; limit = $m.patterns.concurrency_limit }
    } catch {}
    Start-Sleep -Milliseconds 800
  }
  $samples
} -ArgumentList $root, 45
Invoke-K6 'r1'
$samples1 = Receive-Job $job1 -Wait
$samples1 | ConvertTo-Json -Depth 5 | Set-Content "$ev\60-inflight-samples-r1.json" -Encoding utf8
Remove-Job $job1 -Force -ErrorAction SilentlyContinue
Snapshot 'after-r1'

& "$PSScriptRoot\mysql-latency.ps1" -Action disable | Out-Host
$rec = Measure-Recovery
$rec | ConvertTo-Json | Set-Content "$ev\60-recovery.json" -Encoding utf8
Write-Host ("Recuperacion: " + ($rec | ConvertTo-Json -Compress))
Write-Host 'Bulkhead R0/R1 completado'
