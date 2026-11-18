# Watchdog autónomo (Fase 4)

## Arquitectura

Contenedor `seguridad-caos-exp2-watchdog` en `lab_clients` (`internal: true`):

- Lee `runtime/events/experiment_deadline.json`
- Escribe heartbeat `watchdog_heartbeat.json`
- Audita en `watchdog.jsonl`
- Al vencer: `STOP` + `ABORT_PROBES`
- UID 10001 tras entrypoint; sin Docker socket; sin privileged; sin egreso

## Independencia de PowerShell

El proceso vive en Docker. Matar la consola del runner **no** detiene el watchdog.

## Plazo

Persistido en JSON con `deadline_utc` original. Reiniciar el contenedor **no** reinicia el plazo.  
Sin `active: true` → idle (no STOP por estar encendido).

## Fail-safe

Runners (`Assert-LabWatchdogHealthyOrCancel`) exigen contenedor running + heartbeat fresco; si falla → STOP y cancelación.
