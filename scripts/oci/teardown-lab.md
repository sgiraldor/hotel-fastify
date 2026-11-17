# Apagado / teardown del lab OCI (reproducible)

Ejecutar **solo con autorización** y después de guardar evidencias.

## Conservar siempre

- Código Git / commits / tag `v1.1.0`
- Carpeta `evidencias/`
- Capturas de `/metrics`, logs y resultados de caos

## Orden recomendado

```bash
# 0) Evidencias
kubectl get deploy,po,svc,pvc -o wide > evidencias/teardown-inventory.txt
kubectl logs -l app=hotel-api --tail=200 > evidencias/teardown-hotel-logs.txt

# 1) Workloads
kubectl delete -f k8s/hotel-api-hpa.yaml --ignore-not-found
kubectl delete -f k8s/hotel-api-service.yaml --ignore-not-found
kubectl delete -f k8s/hotel-api-deployment.yaml --ignore-not-found
kubectl delete -f k8s/mysql-lab.yaml --ignore-not-found

# 2) Node pool → 0 (corta el compute variable)
oci ce node-pool update --node-pool-id <NODE_POOL_OCID> --size 0

# 3) Borrar cluster OKE Basic
oci ce cluster delete --cluster-id <CLUSTER_OCID> --force

# 4) Red solo si es exclusiva del lab
# oci network vcn delete ...
```

PowerShell helper: `scripts/oci/teardown-lab.ps1` (dry-run por defecto).
