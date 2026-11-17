# Observabilidad compartida en OKE (Samuel)

Stack académico en el mismo worker ARM64: Collector + Tempo + Prometheus + Grafana.

## Exposición (sin NLB nuevo)

| Componente | Acceso |
|------------|--------|
| OTLP HTTP | NodePort `31418` en IP pública del worker (Basic Auth) |
| Grafana / Prometheus / Tempo | ClusterIP → `kubectl port-forward` |

**No** se crea un segundo LoadBalancer (costo). HTTPS omitido a propósito (evitar LB/cert de pago).

## Aplicar

```powershell
$env:OTEL_LAB_TOKEN = "<token-lab-compartido>"
powershell -File k8s/observability/create-secrets.ps1
powershell -File k8s/observability/apply.ps1
kubectl apply -f k8s/hotel-api-configmap.yaml
kubectl rollout restart deploy/hotel-api
```

## Grafana (sustentación)

```powershell
kubectl -n observability port-forward svc/grafana 3001:3000
# http://127.0.0.1:3001  dashboard "Seguimiento #4 — Multicloud Observability"
```

Contrato para Sports/Cine: `docs/seguimiento-4/OBSERVABILIDAD_COMPARTIDA.md`.
