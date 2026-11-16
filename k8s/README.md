# Kubernetes — Hotel API (adaptable a OKE)

Manifiestos **válidos y versionados**. No implican despliegue real en OCI.

## Aplicar (cuando exista cluster)

```bash
kubectl apply -f k8s/hotel-api-configmap.yaml
kubectl create secret generic hotel-api-secrets \
  --from-literal=DB_USER='...' \
  --from-literal=DB_PASSWORD='...' \
  --from-literal=CHAOS_LAB_TOKEN='...'
kubectl apply -f k8s/hotel-api-deployment.yaml
kubectl apply -f k8s/hotel-api-service.yaml
kubectl apply -f k8s/hotel-api-hpa.yaml
```

## Verificar

```bash
kubectl get deploy,po,svc,hpa -l app=hotel-api
kubectl rollout status deploy/hotel-api
kubectl logs -l app=hotel-api --tail=100
curl -sS http://<EXTERNAL-IP>/live
curl -sS http://<EXTERNAL-IP>/ready
curl -sS -H "x-trace-id: demo-1" http://<EXTERNAL-IP>/api/v2/habitacion/1
```

## Rollback

```bash
kubectl rollout undo deploy/hotel-api
kubectl rollout status deploy/hotel-api
```

## Notas OKE

- Sustituir `bog.ocir.io/REPLACE_NAMESPACE/hotel-api:1.1.0` por la imagen en OCIR.
- Habilitar `imagePullSecrets` con secret OCIR si el repositorio es privado.
- `Service` tipo `LoadBalancer` provisiona LB en OKE (puede generar costo).
