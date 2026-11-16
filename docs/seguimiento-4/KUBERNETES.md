# Kubernetes / OKE — Hotel

Manifiestos en `/k8s`:

- Deployment `replicas: 2`
- Service LoadBalancer
- readiness `/ready`, liveness `/live`
- requests/limits CPU/memoria
- ConfigMap + ejemplo Secret
- HPA min 2 / max 5

**Estado:** versionados y validados estructuralmente. **No desplegados automáticamente** en esta rama.

Ver `k8s/README.md` y `terraform/oci/README.md` (`create_oke=false` por defecto).
