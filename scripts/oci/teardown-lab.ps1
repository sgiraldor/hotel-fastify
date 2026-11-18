# Dry-run por defecto. No borra nada salvo -ExecuteReal.
param(
  [switch]$ExecuteReal,
  [string]$ClusterId = "",
  [string]$NodePoolId = ""
)

$ErrorActionPreference = "Stop"
Write-Host "Modo: $(if ($ExecuteReal) { 'EXECUTE' } else { 'DRY-RUN' })"

$steps = @(
  "kubectl delete -f k8s/hotel-api-hpa.yaml --ignore-not-found",
  "kubectl delete -f k8s/hotel-api-service.yaml --ignore-not-found",
  "kubectl delete -f k8s/hotel-api-deployment.yaml --ignore-not-found",
  "kubectl delete -f k8s/mysql-lab.yaml --ignore-not-found"
)

if ($NodePoolId) {
  $steps += "oci ce node-pool update --node-pool-id $NodePoolId --size 0"
}
if ($ClusterId) {
  $steps += "oci ce cluster delete --cluster-id $ClusterId --force"
}

foreach ($cmd in $steps) {
  Write-Host ">> $cmd"
  if ($ExecuteReal) {
    Invoke-Expression $cmd
  }
}

if (-not $ExecuteReal) {
  Write-Host "Dry-run completado. Relanzar con -ExecuteReal tras autorizacion."
}
