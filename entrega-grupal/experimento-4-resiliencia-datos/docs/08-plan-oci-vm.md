# Plan — VM OCI independiente (Exp4)

Este plan se escribió antes del despliegue. La VM se creó después, con autorización, y R0/R1 se midieron el 2026-11-18. El texto siguiente conserva la secuencia prevista.

## Precondiciones

1. Fase 5 smoke local PASS.
2. Fase 6 auditoría read-only revisada.
3. Fase 7 portabilidad (Bash + Git paths) lista.
4. Costos y shape confirmados **el día del despliegue** (precio/free/capacidad) para vida OCI **≥9 h** (plan **12 h**). Ver `docs/13-costos-oci-exp4.md`. **No** declarar USD 5 suficiente sin verificar. Terraform/watchdog **no** son circuit-breakers de presupuesto ni auto-destroy.

## Secuencia autorizada futura

1. Preflight local + `git-lab-status`.
2. Crear VCN/subnet/NSG/VM **solo** con tags Exp4 (ver `oci/`).
3. Instalar Docker Engine + Compose en la VM.
4. Clonar/copiar `entrega-grupal/experimento-4-resiliencia-datos/`.
5. `./scripts/prepare-linux-perms.sh` y `./scripts/preflight.sh --check-docker-config`.
6. Rebuild imágenes en la arquitectura de la VM (`docker compose build`).
7. Smoke OCI (sin R0/R1) + verificar aislamiento (sin rutas a Hotel).
8. `EXP4_ALLOW_COMPOSE=1 ./scripts/run-r0.sh --authorized` + restore manual `./scripts/restore-manual-r0.sh`.
9. `./scripts/run-r1.sh --authorized`.
10. Comparar métricas RPO/RTO en `evidencias-publicas/` (conservar backups/logs).
11. Mantener infra OCI disponible ≥9 h para sustentación (`docs/17-ventana-oci-vs-ttl-sustentacion.md`). TTL/STOP no apagan la VM.
12. Cleanup por OCID **solo post-sustentación y con autorización** (`docs/12-cleanup-oci.md`).
13. Verificar Hotel / exp2 intactos.

## Prohibiciones

- Reinstalar el lab dentro de `hotel-oke`.
- Peering a `hotel-vcn`.
- Credenciales OKE en la VM.
- Publicar MySQL.
- Object Storage obligatorio (opcional y evitabile).

## IaC (Fase 9)

Directorio: `oci/terraform/` (state local aislado).  
Gate: `enable_exp4_oci=false` por defecto.  
Acceso: `access_mode=bastion` (preferido) o `restricted_public`.  
Costos/NAT: `docs/13-costos-oci-exp4.md`.  
Prep VM: `docs/15-preparacion-vm-exp4.md`.  
Cleanup: `docs/14-runbook-cleanup-oci.md`.
