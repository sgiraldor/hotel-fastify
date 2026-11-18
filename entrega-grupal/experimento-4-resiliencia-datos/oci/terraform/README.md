# Terraform Exp4 — infraestructura completa (NO APPLY sin autorización)

## Aislamiento de state

- Backend **local** `terraform.tfstate` en este directorio.
- `.gitignore` excluye state y `.terraform/`.
- **No** `terraform_remote_state` Hotel.
- **No** compartir state con `terraform/oci` DevOps.

## Gate

```hcl
enable_exp4_oci = false   # default
```

Con `false`: todos los recursos tienen `count = 0` → validate/plan aislado no propone create de lab.

## Acceso administrativo

| Modo | Valor `access_mode` | Notas |
|---|---|---|
| **A (preferido seguridad)** | `bastion` | Subnet privada + Bastion **Free** + NAT egreso Docker (**costo NAT no confirmado**) |
| B (menor incertidumbre NAT) | `restricted_public` | Subnet pública + SSH solo `ssh_authorized_cidr` (validado ≠ 0.0.0.0/0) |

## Validaciones locales permitidas

```bash
cd oci/terraform
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
# NO: terraform plan/apply/destroy (salvo autorización futura explícita)
```

## Imagen

OCID A1 verificado por lectura OCI (sa-bogota-1) en `terraform.tfvars.example`. No inventar OCIDs.
