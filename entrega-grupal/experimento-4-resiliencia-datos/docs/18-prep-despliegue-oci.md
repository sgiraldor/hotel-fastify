# Preparación operativa del despliegue OCI Exp4

**Estado:** NO-GO PARA APPLY hasta completar bloqueadores de acceso.
**Prohibido aquí:** `terraform apply` / `destroy`, R0/R1, commit/push.

## Parámetros técnicos confirmados (solo lectura OCI)

| Parámetro | Valor | Estado |
|---|---|---|
| Región / home | `sa-bogota-1` | OK |
| Shape | `VM.Standard.A1.Flex` listado en región | OK |
| OCPU / RAM / boot | 1 / 6 GB / 50 GB (diseño Terraform) | OK |
| Imagen | Oracle-Linux-9.8-aarch64-2026.10.30-0 `AVAILABLE` | OK |
| Cuota A1 cores | used 2 / available 248 (servicio; ≠ Always Free) | OK cuota |
| Cuota A1 memory | used 12 / available 1654 | OK cuota |
| Block storage | used 100 GB / available 61340 GB | OK cuota |
| Modo acceso | `bastion` (default; no cambiar a restricted_public) | OK diseño |
| Vida OCI | mín. 9 h / plan 12 h; sin auto-destroy | OK diseño |

## Acceso operador (actualizado)

| Elemento | Estado |
|---|---|
| OpenSSH Client Windows | OK (`OpenSSH_for_Windows_9.5p2`) |
| Clave exclusiva Exp4 | `~/.ssh/id_ed25519_oci_exp4` (+ `.pub`) · ED25519 · fingerprint en evidencias |
| `terraform.tfvars` local (gitignored) | Presente con `enable_exp4_oci=false`, CIDR + pubkey (sin privada) |
| CIDR del operador | Quedó solo en `terraform.tfvars` local (gitignored). No se publica. |
| CIDR de documentación `203.0.113.10/32` | **Prohibido** |
| Clave `plan-only` Fase 11 | **No** usar |
| Plan `enable=true` | Aún no generado (paso siguiente con autorización) |

## Qué debe aportar el operador antes del plan definitivo

1. Generar (fuera de este agente) un par SSH y entregar **solo** la `.pub`.
2. Confirmar CIDR real (p.ej. `A.B.C.D/32` de la IP pública estable del operador). Nunca `0.0.0.0/0`.
3. Crear `terraform.tfvars` local (gitignored) con: `compartment_ocid`, `image_ocid`, `ssh_public_key`, `ssh_authorized_cidr`, `access_mode="bastion"`, `enable_exp4_oci=false` hasta autorización de apply.
4. Verificar IAM: permisos para crear Bastion STANDARD, VCN/subnet/SL/NSG, compute A1, NAT/IGW en el compartment destino.
5. Recién entonces: `terraform plan -out=...` **fuera de Git** con `enable_exp4_oci=true` (solo plan).

## Renovar sesiones Bastion (durante ≥9–12 h)

1. Crear sesión MANAGED_SSH / SSH hacia la VM privada (plugin Bastion ENABLED).
2. TTL máximo de sesión STANDARD: **3 h** → renovar antes de expirar.
3. Allowlist del Bastion = `ssh_authorized_cidr` del operador.
4. Renovar sesión **no** recrea la VM ni ejecuta destroy.

## Condiciones usadas antes de R0/R1

La corrida OCI del 2026-11-18 ya cumplió esta lista. Se conserva como procedimiento, no como un estado de “aún no ejecutado”.

1. Smoke `evidencias/smoke-*` se **conserva**; no borrar.
2. `runtime/events/STOP` en vivo **bloquea** nuevos runs → quitar STOP solo al autorizar corrida, sin borrar backups del smoke.
3. `run_id` nuevo vía `new_lab_run_id` (p.ej. `r0-YYYYMMDDTHHMMSSZ`).
4. Watchdog healthy antes de fault/restore.
5. R0: espera `restore-manual-r0.sh --authorized`.
6. R1: restore `mode=auto` (G2) + backup mid (G1).
7. Backups en `runtime/backups/` preservados; VM OCI permanece tras STOP de cada prueba.

## Terraform (revisión estática)

- Backend local exclusivo Exp4; `enable_exp4_oci=false` default.
- Tags `experimento=seguridad-caos-exp4`; SL explícitas; subnet privada; NSG mínimo.
- Sin peering Hotel; sin 3306 público; `oci_auto_destroy_after_hours=false`.

## Veredicto

**NO-GO PARA APPLY** — faltan SSH pubkey real y CIDR administrativo confirmado; no se generó plan definitivo `enable=true`.
