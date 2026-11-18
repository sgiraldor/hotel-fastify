# Controla latencia artificial MySQL vía Toxiproxy (sin borrar datos).
param(
  [ValidateSet('enable', 'disable', 'status', 'setup')]
  [string]$Action = 'status',
  [int]$LatencyMs = 2500,
  [string]$ToxiproxyUrl = 'http://127.0.0.1:8474'
)

$ErrorActionPreference = 'Stop'
$headers = @{ 'User-Agent' = 'hotel-lab-toxiproxy'; 'Content-Type' = 'application/json' }

function Ensure-Proxy {
  try {
    Invoke-RestMethod -Headers $headers "$ToxiproxyUrl/proxies/mysql" | Out-Null
    return
  } catch {}

  $body = '{"name":"mysql","listen":"0.0.0.0:3306","upstream":"mysql:3306","enabled":true}'
  Invoke-RestMethod -Method POST -Uri "$ToxiproxyUrl/proxies" -Headers $headers -Body $body | Out-Null
  Write-Host 'Proxy mysql creado (listen 3306 -> mysql:3306)'
}

function Remove-Latency {
  try {
    Invoke-RestMethod -Method DELETE -Headers $headers -Uri "$ToxiproxyUrl/proxies/mysql/toxics/latency" | Out-Null
  } catch {}
}

switch ($Action) {
  'setup' {
    Ensure-Proxy
    Write-Host 'Toxiproxy listo sin latencia'
  }
  'enable' {
    Ensure-Proxy
    Remove-Latency
    $toxic = @{
      name       = 'latency'
      type       = 'latency'
      stream     = 'downstream'
      toxicity   = 1.0
      attributes = @{ latency = $LatencyMs; jitter = 50 }
    } | ConvertTo-Json -Depth 4 -Compress
    Invoke-RestMethod -Method POST -Uri "$ToxiproxyUrl/proxies/mysql/toxics" -Headers $headers -Body $toxic | Out-Null
    Write-Host "Latencia MySQL habilitada: ${LatencyMs}ms (+jitter 50)"
  }
  'disable' {
    Ensure-Proxy
    Remove-Latency
    Write-Host 'Latencia MySQL deshabilitada'
  }
  'status' {
    try {
      Invoke-RestMethod -Headers $headers "$ToxiproxyUrl/proxies/mysql" | ConvertTo-Json -Depth 6
    } catch {
      Write-Host 'Proxy mysql no existe aún'
    }
  }
}
