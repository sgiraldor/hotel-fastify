# Controla latencia artificial MySQL vía Toxiproxy (sin borrar datos).
param(
  [ValidateSet('enable', 'disable', 'status', 'setup')]
  [string]$Action = 'status',
  [int]$LatencyMs = 2500,
  [string]$ToxiproxyUrl = 'http://127.0.0.1:8474'
)

$ErrorActionPreference = 'Stop'

function Ensure-Proxy {
  try {
    Invoke-RestMethod "$ToxiproxyUrl/proxies/mysql" | Out-Null
    return
  } catch {}

  $body = @{
    name     = 'mysql'
    listen   = '0.0.0.0:3306'
    upstream = 'mysql:3306'
    enabled  = $true
  } | ConvertTo-Json

  Invoke-RestMethod -Method POST -Uri "$ToxiproxyUrl/proxies" `
    -ContentType 'application/json' -Body $body | Out-Null
  Write-Host 'Proxy mysql creado (listen 3306 -> mysql:3306)'
}

function Remove-Latency {
  try {
    Invoke-RestMethod -Method DELETE -Uri "$ToxiproxyUrl/proxies/mysql/toxics/latency" | Out-Null
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
    } | ConvertTo-Json -Depth 4
    Invoke-RestMethod -Method POST -Uri "$ToxiproxyUrl/proxies/mysql/toxics" `
      -ContentType 'application/json' -Body $toxic | Out-Null
    Write-Host "Latencia MySQL habilitada: ${LatencyMs}ms (+jitter 50)"
  }
  'disable' {
    Ensure-Proxy
    Remove-Latency
    Write-Host 'Latencia MySQL deshabilitada'
  }
  'status' {
    try {
      $p = Invoke-RestMethod "$ToxiproxyUrl/proxies/mysql"
      $p | ConvertTo-Json -Depth 6
    } catch {
      Write-Host 'Proxy mysql no existe aún'
    }
  }
}
