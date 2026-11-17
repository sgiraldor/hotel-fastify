# Aplica stack de observabilidad compartida en OKE (sin NLB nuevo).
# Prerrequisito: create-secrets.ps1 ya ejecutado.
$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
# $PSScriptRoot = .../k8s/observability → repo root = ../..
$repo = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path

kubectl apply -f "$PSScriptRoot/00-namespace.yaml"
kubectl apply -f "$PSScriptRoot/tempo.yaml"
kubectl apply -f "$PSScriptRoot/otel-collector.yaml"
kubectl apply -f "$PSScriptRoot/prometheus.yaml"
kubectl apply -f "$PSScriptRoot/grafana.yaml"

$dash = Join-Path $repo "observability/grafana-dashboard-multicloud.json"
kubectl -n observability create configmap grafana-dashboards `
  --from-file=multicloud.json=$dash `
  --dry-run=client -o yaml | kubectl apply -f -

Write-Host "Esperando rollouts..."
kubectl -n observability rollout status deploy/tempo --timeout=180s
kubectl -n observability rollout status deploy/otel-collector --timeout=180s
kubectl -n observability rollout status deploy/prometheus --timeout=180s
kubectl -n observability rollout status deploy/grafana --timeout=180s

kubectl -n observability get pods,svc
Write-Host "Grafana: kubectl -n observability port-forward svc/grafana 3001:3000"
Write-Host "OTLP NodePort: http://<NODE_EXTERNAL_IP>:31418"
