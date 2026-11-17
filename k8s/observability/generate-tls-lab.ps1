# Genera cert lab autofirmado (IP SAN) y Secret otel-tls-lab.
# No escribe la clave privada en Git. El certificado público se publica en observability/certs/.
$ErrorActionPreference = "Stop"

$repo = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$certDir = Join-Path $repo "observability/certs"
$work = Join-Path $env:TEMP ("otel-tls-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $work, $certDir | Out-Null

$ip = if ($env:OTEL_PUBLIC_IP) { $env:OTEL_PUBLIC_IP } else { "157.137.233.183" }

$opensslConf = @"
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
CN = hotel-otel-lab
O = seguimiento-4
OU = observability-lab

[v3_req]
basicConstraints = CA:false
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
IP.1 = $ip
DNS.1 = otel-lab.local
"@

$confPath = Join-Path $work "openssl.cnf"
$keyPath = Join-Path $work "tls.key"
$crtPath = Join-Path $work "tls.crt"
[IO.File]::WriteAllText($confPath, $opensslConf)

Write-Host "Generando certificado lab para IP $ip ..."
# Imagen multi-arch con openssl; montaje compatible Windows Docker Desktop
docker run --rm -v "${work}:/work" docker.io/alpine/openssl:latest `
  req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes `
  -keyout /work/tls.key -out /work/tls.crt `
  -config /work/openssl.cnf

if (-not (Test-Path $crtPath) -or -not (Test-Path $keyPath)) {
  Write-Error "No se genero el certificado TLS"
}

Copy-Item $crtPath (Join-Path $certDir "otel-lab.crt") -Force
# Cadena = mismo cert (autofirmado). Clientes: OTEL_EXPORTER_OTLP_CERTIFICATE o NODE_EXTRA_CA_CERTS
Copy-Item $crtPath (Join-Path $certDir "otel-lab-ca.crt") -Force

kubectl apply -f "$PSScriptRoot/00-namespace.yaml" | Out-Host
kubectl -n observability create secret tls otel-tls-lab `
  --cert=$crtPath `
  --key=$keyPath `
  --dry-run=client -o yaml | kubectl apply -f - | Out-Host

Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Secret otel-tls-lab aplicado. Cert publico en observability/certs/ (sin clave privada)."
