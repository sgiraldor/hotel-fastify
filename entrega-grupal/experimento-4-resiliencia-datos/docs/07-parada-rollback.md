# STOP, watchdog y rollback

## Dos relojes

| Reloj | Efecto |
|---|---|
| **TTL del experimento** (`MaxMinutes` → `experiment_deadline.json`) | Watchdog escribe **STOP**; se detienen fallo/restore/caos. |
| **Vida OCI (≥9 h)** | Independiente. STOP **no** apaga la VM ni destruye Terraform. |

Detalle: [`17-ventana-oci-vs-ttl-sustentacion.md`](17-ventana-oci-vs-ttl-sustentacion.md).

## STOP

Archivo `runtime/events/STOP`. Cualquier operador puede crearlo vía `scripts/stop-experiment.ps1` / `.sh`.

Impide **operaciones experimentales** fuera de la ventana autorizada de la corrida. No es cleanup OCI.

## Watchdog

Contenedor sin `docker.sock`, sin privilegios, red `internal`. Lee `experiment_deadline.json` y escribe STOP al vencer el TTL de la corrida.

`lab_watchdog_terminates_oci = false` (output Terraform): el watchdog **nunca** termina instancias OCI.

## Conservación de evidencias

Tras STOP / fin de R0/R1:

1. Conservar `runtime/events`, `runtime/backups` y métricas.
2. Copiar lo necesario a `evidencias/` / `evidencias-publicas/`.
3. No usar `down --volumes` ni borrar backups como parte del STOP normal.

## Rollback del lab (Compose)

1. Escribir STOP.
2. Preservar eventos y backups relevantes.
3. `docker compose -p seguridad-caos-exp4 stop` (solo con `EXP4_ALLOW_COMPOSE_STOP=1`).
4. Opcional destructivo: `down --volumes` solo con flags dobles, confirmación, y **después** de exportar evidencias.

No afecta Hotel/Sports/Cine. No ejecuta `terraform destroy`.
