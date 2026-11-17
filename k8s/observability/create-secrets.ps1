# Crea secrets de observabilidad SIN escribir tokens en Git.
# Uso:
#   $env:OTEL_LAB_TOKEN = "<token-compartido-lab>"
#   $env:GRAFANA_ADMIN_PASSWORD = "<password>"   # opcional
#   powershell -File k8s/observability/create-secrets.ps1

$ErrorActionPreference = "Stop"

if (-not $env:OTEL_LAB_TOKEN -or $env:OTEL_LAB_TOKEN.Trim() -eq "") {
  Write-Error "Define OTEL_LAB_TOKEN en el entorno (no lo commits)."
}

$grafanaPass = $env:GRAFANA_ADMIN_PASSWORD
if (-not $grafanaPass) {
  $grafanaPass = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 20 | ForEach-Object { [char]$_ })
  Write-Host "GRAFANA_ADMIN_PASSWORD generado (guardar fuera de Git)."
}

kubectl apply -f "$PSScriptRoot/00-namespace.yaml" | Out-Host

Write-Host "Generando htpasswd (docker httpd)..."
$htpasswdLine = (docker run --rm httpd:2.4-alpine htpasswd -nbB otel-lab $env:OTEL_LAB_TOKEN).Trim()
if (-not $htpasswdLine -or $htpasswdLine -notmatch '^otel-lab:') {
  Write-Error "No se pudo generar htpasswd con docker httpd:2.4-alpine"
}

$htFile = Join-Path $env:TEMP ("otel-htpasswd-" + [guid]::NewGuid().ToString("N"))
[IO.File]::WriteAllText($htFile, $htpasswdLine)

kubectl -n observability create secret generic otel-lab-basicauth `
  --from-file=htpasswd=$htFile `
  --dry-run=client -o yaml | kubectl apply -f - | Out-Host

Remove-Item $htFile -Force -ErrorAction SilentlyContinue

kubectl -n observability create secret generic grafana-admin `
  --from-literal=admin-password=$grafanaPass `
  --dry-run=client -o yaml | kubectl apply -f - | Out-Host

$pair = "otel-lab:$($env:OTEL_LAB_TOKEN)"
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$otlpHeaders = "Authorization=Basic $b64"
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($otlpHeaders))

$patchPath = Join-Path $env:TEMP ("otel-headers-patch-" + [guid]::NewGuid().ToString("N") + ".json")
[IO.File]::WriteAllText($patchPath, ('{"data":{"OTEL_EXPORTER_OTLP_HEADERS":"' + $encoded + '"}}'))

kubectl get secret hotel-api-secrets 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  kubectl patch secret hotel-api-secrets --type merge --patch-file $patchPath | Out-Host
  Write-Host "hotel-api-secrets actualizado con OTEL_EXPORTER_OTLP_HEADERS"
} else {
  Write-Warning "hotel-api-secrets ausente; crea DB/CHAOS antes de parchear OTEL headers."
}

Remove-Item $patchPath -Force -ErrorAction SilentlyContinue
Write-Host "OK. Usuario OTLP: otel-lab. No imprimas ni commits el token."
