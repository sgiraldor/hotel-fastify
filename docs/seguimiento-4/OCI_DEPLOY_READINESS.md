# Preparación de despliegue OCI/OKE — Hotel API (solo lectura verificada)

Fecha de verificación local: 2026-11-16.  
**No se creó ni modificó infraestructura cloud en esta verificación.**

## Hallazgos verificados (solo lectura)

| Elemento | Resultado real |
|---|---|
| Región CLI | `sa-bogota-1` |
| Perfil OCI | `DEFAULT` (API key; usuario `ACTIVE`) |
| Auth | OK (`oci os ns get`) |
| Compartimentos hijos listables | 0 (solo tenancy root visible en la consulta) |
| Clusters OKE | **0** en tenancy root |
| VCN | **0** |
| Compute instances | **0** |
| MySQL DB Systems | **0** |
| Load Balancers | **0** |
| Repos OCIR | **0** |
| kubeconfig | Contexto `context-hotel-okes-...` presente |
| Alcance al API K8s | **NO** — timeout a host del control plane |

Conclusión: existe **configuración local residual** de un OKE histórico (`hotel-okes`), pero **no hay cluster alcanzable ni inventario cloud activo** detectable con las consultas actuales. Los manifiestos en `k8s/` y el TF en `terraform/oci/` **no equivalen** a recursos desplegados.

## A. Recursos existentes y verificados

- Credenciales OCI CLI operativas en región Bogotá.
- Namespace de Object Storage / patrón OCIR histórico documentado en `main` (`bog.ocir.io/<ns>/...`).
- Manifiestos Hotel listos en repo (2 réplicas, probes, resources).
- Validación local Docker/MySQL/API ya hecha en `evidencias/seguimiento-4-local/`.

## B. Recursos definidos en código (no desplegados)

- `k8s/hotel-api-*.yaml` (Deployment, Service LB, ConfigMap, Secret example, HPA).
- `terraform/oci/*` con `create_oke=false` por defecto (esqueleto; sin apply).

## C. Recursos que todavía habría que crear (con autorización)

Para un despliegue real mínimo académico, en este orden:

1. **Reutilizar** OKE + MySQL + OCIR si el laboratorio/profesor los provee (preferido, menor costo).
2. Si no existen (estado actual observado):  
   - VCN/subnets (o red del lab)  
   - Cluster OKE + node pool (≥1–2 nodos pequeños)  
   - Repositorio OCIR `hotel-api`  
   - MySQL alcanzable desde nodos (Managed MySQL **o** instancia/lab existente)  
   - Secret `ocirsecret` + `hotel-api-secrets`  
   - Service LoadBalancer (o NodePort/Ingress del lab)

## D. Permisos necesarios

- `manage` / `use` en Container Engine, Networking, Artifacts/OCIR, Secrets locales K8s.
- Push a OCIR (auth token de usuario o resource principal).
- `kubectl` con kubeconfig renovado (`oci ce cluster create-kubeconfig`).
- Lectura de endpoint MySQL y secretos DB (fuera de Git).

## E. Costos potenciales (cualitativo)

| Recurso | Costo relativo |
|---|---|
| OKE control plane (según tipo) | Medio |
| Node pool 2× Flex 1 OCPU/8GB | **Alto** en lab |
| Service `LoadBalancer` | Medio (cargo recurrente) |
| MySQL managed nuevo | **Alto** |
| OCIR storage | Bajo |
| OTLP collector propio | Medio si se instancia aparte |

**Recomendación de costo:** no crear OKE nuevo si el curso ofrece uno compartido; evitar MySQL managed nuevo si hay DB de laboratorio; considerar `ClusterIP` + port-forward/`kubectl proxy` solo para demos internas (no sirve para Sports públicos).

## F. Comandos que requieren autorización (NO ejecutar aún)

```bash
# 1) Renovar kubeconfig cuando exista cluster
oci ce cluster create-kubeconfig --cluster-id <CLUSTER_OCID> --file $HOME/.kube/config --region sa-bogota-1 --overwrite-config

# 2) Build + push OCIR (cuando exista repo)
docker build -t bog.ocir.io/<NS>/hotel-api:1.1.0 .
docker push bog.ocir.io/<NS>/hotel-api:1.1.0

# 3) Secretos (valores fuera de Git)
kubectl create secret docker-registry ocirsecret ...
kubectl create secret generic hotel-api-secrets --from-literal=DB_USER=... --from-literal=DB_PASSWORD=... --from-literal=CHAOS_LAB_TOKEN=...

# 4) Aplicar manifiestos
kubectl apply -f k8s/hotel-api-configmap.yaml
kubectl apply -f k8s/hotel-api-deployment.yaml
kubectl apply -f k8s/hotel-api-service.yaml
kubectl apply -f k8s/hotel-api-hpa.yaml
```

Cualquier `terraform apply` con `create_oke=true` también requiere autorización explícita (genera costo).

## Variables que faltan hoy en manifiestos

| Variable / campo | Estado |
|---|---|
| Imagen `bog.ocir.io/<NS>/hotel-api:1.1.0` | Placeholder `REPLACE_NAMESPACE` |
| `imagePullSecrets: ocirsecret` | Comentado |
| `DB_HOST` | `REPLACE_MYSQL_HOST` |
| Secret DB + `CHAOS_LAB_TOKEN` | Solo example |
| Endpoint OTLP real | Apunta a `otel-collector` (debe existir en cluster) |
| kubeconfig válido | Stale / inalcanzable |

## Procedimiento más simple (recomendado)

1. **Confirmar con el equipo/profesor** si ya hay OKE compartido en OCI (otro compartment/tenancy).
2. Si sí: pedir acceso + kubeconfig + MySQL host + permiso OCIR; **no** crear TF.
3. Completar ConfigMap/Secret locales (sin commit de secretos).
4. Con autorización: build/push imagen → `kubectl apply` → verificar `/live` `/ready` y `GET /api/v2/habitacion/1`.
5. Entregar URL interna/pública a Jarrison (Sports).
6. Solo si no hay lab: autorizar creación mínima OKE (1 pool pequeño) + DB reutilizable.

## Bloqueo actual

**No es viable desplegar Hotel en OKE ahora mismo** sin crear infraestructura nueva o sin acceso a un cluster/lab existente distinto del inventario vacío detectado. El siguiente paso no es técnico de código: es **autorización / acceso a recursos de laboratorio**.
