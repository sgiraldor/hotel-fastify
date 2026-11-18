# Ventana OCI ≥9 h vs TTL del experimento (sustentación)

## Separación obligatoria

1. **TTL del experimento** (`MaxMinutes`, `runtime/events/experiment_deadline.json`, watchdog → `STOP`):
   - Solo detiene **operaciones** de fallo, restore y caos del lab Compose.
   - Conserva backups, logs y evidencias en `runtime/` / `evidencias*`.
   - **No** termina la instancia OCI, **no** ejecuta `terraform destroy`.

2. **Vida de la infraestructura OCI** (`oci_min_availability_hours ≥ 9`, planificación `oci_planned_availability_hours ≥ 12`):
   - La VM Exp4, VCN, SL/NSG, Bastion/NAT deben permanecer **disponibles** al menos **9 horas** para R0/R1, verificación de evidencias y sustentación.
   - **No** hay eliminación automática de la VM al cumplirse 9 h ni 12 h.
   - `terraform destroy` / terminate: **solo** con autorización expresa **después** de la sustentación.

## Qué permanece tras STOP / TTL

- `runtime/backups/`
- `runtime/events/` (incl. STOP, watchdog audit, métricas)
- Artefactos copiados a `evidencias/` / `evidencias-publicas/`
- Contenedores pueden detenerse; la **VM OCI sigue encendida** hasta cleanup autorizado.

## Sesiones Bastion

- Cada sesión Bastion STANDARD dura como máximo **3 h** (límite del servicio).
- Durante las ≥9 h de infra, el operador **renueva** sesiones; eso no implica recrear la VM.

## Procedimiento: verificar que el lab estará operativo en sustentación

Ejecutar **antes** de la ventana oral (idealmente T−60 min y T−10 min). No ejecuta R0/R1 ni apply.

### A. Infra OCI (identidad Exp4)

1. Confirmar instancia Exp4 `RUNNING` por **OCID** inventariado (`terraform output inventory_ocids` / tags `experimento=seguridad-caos-exp4`).
2. Confirmar que **no** se listó worker Hotel / `hotel-oke` / `hotel-vcn` por error de nombre.
3. Acceso admin: nueva sesión Bastion (o SSH desde `ssh_authorized_cidr` si modo public) hacia la VM Exp4.
4. `uptime` / reloj UTC en la VM; estimar horas restantes ≥ tiempo de sustentación.

### B. Laboratorio Compose en la VM

5. `docker compose -p seguridad-caos-exp4 ps` — servicios críticos up o recuperables sin wipe.
6. `./scripts/preflight.sh --check-docker-config` (o equivalente).
7. Heartbeat watchdog presente si el stack ops está arriba; si hay `STOP` de una corrida previa, **no** borrar evidencias — limpiar STOP solo si se autoriza una nueva corrida corta de demo.
8. Verificar que existen backups/evidencias de R0/R1 ya ejecutados (si la demo es post-experimento) bajo rutas acordadas.

### C. Aislamiento y no-regresión

9. Sin peering/rutas a `hotel-vcn`; sin credenciales OKE en la VM.
10. Spot-check Hotel: cluster/worker/VCN intactos (solo lectura).
11. Confirmar que **no** hay job/cron/`terraform` programado que destruya Exp4 durante la sustentación.

### D. Criterio GO / NO-GO sustentación

- **GO:** VM Exp4 RUNNING, acceso admin OK, evidencias accesibles, Hotel intacto, sin destroy programado, horas OCI restantes ≥ duración de la sesión oral.
- **NO-GO:** VM STOPPED/terminada, sin Bastion/SSH autorizado, evidencias solo en disco efímero perdido, o cleanup ya aplicado.

## Prohibiciones

- Auto-terminate / auto-destroy a las 9 h.
- `terraform destroy` antes o durante la sustentación.
- Confundir STOP del lab con apagado de la VM.
- Tocar Hotel OKE, MySQL Hotel, hotel-vcn, Sports AWS, Cine GCP, obs compartida, `seguridad-caos-exp2/`, `main`, `v1.2.0`.
