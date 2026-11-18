# Preparación VM Exp4

Diseño de la Fase 9. La VM se preparó después y el experimento se midió el 2026-11-18. Este documento conserva el diseño.

cloud-init (`cloud-init.yaml.tftpl`) solo:

- Crea usuario `exp4op`
- Directorios `/opt/exp4`, `/var/lib/exp4/{events,backups,evidence}` modo 0750
- UTC
- **No** instala Docker automáticamente
- **No** copia secretos OCI/OKE
- **No** arranca el laboratorio

Secuencia operador (post-authorize):

1. Acceso: sesión Bastion (modo bastion) o SSH desde `ssh_authorized_cidr` (restricted_public).
2. Instalar Docker Engine + Compose plugin; `usermod -aG docker exp4op`.
3. `uname -m` → si `aarch64`, rebuild lab images.
4. Transferir únicamente `entrega-grupal/experimento-4-resiliencia-datos/` (scp/rsync).
5. `./scripts/prepare-linux-perms.sh`
6. `./scripts/preflight.sh --check-docker-config`
7. Smoke OCI (sin R0/R1 hasta nueva autorización).
8. Validar STOP/watchdog (TTL de corrida ≠ apagado de VM).
9. Planificar vida OCI ≥9 h (ideal 12 h) hasta fin de sustentación; sin cron de destroy.
10. Antes de la oral: checklist GO/NO-GO en `docs/17-ventana-oci-vs-ttl-sustentacion.md`.
