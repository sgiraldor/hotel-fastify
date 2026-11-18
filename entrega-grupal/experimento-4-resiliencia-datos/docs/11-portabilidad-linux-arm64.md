# Portabilidad Linux y ARM64 (Fase 7)

## Modelo operativo elegido: **B — runners Bash en la VM**

| Opción | Evaluación |
|---|---|
| A — PowerShell 7 en Linux | Viable, pero añade dependencia `pwsh` y diferencias de rutas |
| **B — Bash equivalente** | **Elegido:** nativo en Ubuntu/OL OCI, misma semántica de auth/STOP/TTL/R0/R1 |
| C — Control remoto Windows | Útil como complemento; mayor superficie de red |

Scripts Linux: `scripts/*.sh` (paridad con `*.ps1`).

Windows local: continuar con PowerShell.

## Permisos

- `runtime/{events,backups,evidence}`: `0750` dirs / `0640` files
- Sin `chmod 777`
- UID contenedor: `10001` vía `gosu` en entrypoints
- `./scripts/prepare-linux-perms.sh` (opcional con sudo una vez)

## ARM64 (A1.Flex)

La revisión de abajo es estática y anterior al smoke. El 2026-11-18 el smoke OCI en Oracle Linux 9 `aarch64` reconstruyó las imágenes y levantó MySQL 8.4. R0 y R1 corrieron sobre ese runtime. n=1.

| Componente | Base | Nota |
|---|---|---|
| mysql | `mysql:8.4` | Imagen oficial multi-arch; verificada en el smoke OCI ARM64 del 2026-11-18 |
| python services | `python:3.12-slim` | Multi-arch tipico; rebuild en VM ARM |
| cryptography / PyMySQL | pins en requirements | Wheels arm64 suelen existir; confirmar en build OCI |
| mysqldump | `default-mysql-client` en Debian | Disponible en arm64 Debian |
| Builds locales actuales | **amd64** (smoke Windows) | En A1 hay que **rebuild**; en E4 amd64 pueden reutilizarse |

La compatibilidad de runtime ARM quedó comprobada en ese smoke OCI, no en los builds amd64 de Windows.

## Git en evidencias

Usar siempre:

```bash
./scripts/git-lab-status.sh evidencias/git-status.txt
# o
./scripts/git-lab-status.ps1 -OutFile evidencias\git-status.txt
```

Prohibido `Push-Location ../../..` u otros saltos relativos de profundidad fija.
