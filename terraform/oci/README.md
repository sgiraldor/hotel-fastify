# Terraform OCI — laboratorio Hotel (Samuel)

Separado del Terraform AWS histórico (`terraform/` en `main`).

## Principios académicos

1. `create_oke = false` por defecto → **no crea recursos** ni genera costo.
2. Preferir **reutilizar** un OKE/MySQL ya existentes del laboratorio.
3. Nunca versionar claves, `terraform.tfvars` real ni state con secretos.
4. **No ejecutar `terraform apply` sin autorización explícita.**

## Verificar infraestructura existente (antes de provisionar)

```bash
# Consola OCI o CLI (si esta configurada):
oci ce cluster list --compartment-id <COMPARTMENT_OCID>
oci mysql db-system list --compartment-id <COMPARTMENT_OCID>
oci artifacts container repository list --compartment-id <COMPARTMENT_OCID>
```

Si ya hay OKE + MySQL + OCIR: **usar esos endpoints** en `k8s/hotel-api-configmap.yaml` y no crear TF.

## Validación estática (sin apply)

```bash
cd terraform/oci
cp terraform.tfvars.example terraform.tfvars   # completar localmente, no commit
terraform init
terraform validate
terraform plan                                 # solo con autorizacion
```

## Estimación cualitativa de costo (si create_oke=true)

| Recurso | Impacto |
|---|---|
| VCN / IGW / subnet | Bajo / normalmente sin cargo relevante |
| OKE control plane | Puede generar cargo según tipo de cluster |
| 2 nodos E4.Flex 1 OCPU / 8 GB | Medio — principal generador de costo |
| LoadBalancer del Service K8s | Medio |
| OCIR storage | Bajo |
| MySQL nuevo | Medio-alto — preferir DB existente |

## MySQL

No se define RDS/MySQL nuevo aquí. Opciones:

1. Reutilizar MySQL del laboratorio / Cloud SQL / instancia ya creada.
2. MySQL en pod solo para demos locales (no producción académica OKE).

## Relación con Kubernetes

Los manifiestos en `/k8s` son independientes: se aplican a cualquier cluster OKE (nuevo o reutilizado) con `kubectl`.
