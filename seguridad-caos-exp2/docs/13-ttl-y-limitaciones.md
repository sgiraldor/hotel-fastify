# TTL / Watchdog (actualizado Fase 4)

## Mecanismo vigente

Contenedor Docker `seguridad-caos-exp2-watchdog` (ver `docs/14-watchdog.md`):

- Independiente de la sesión PowerShell.
- Plazo en `runtime/events/experiment_deadline.json` (UTC).
- Al vencer: `STOP` + `ABORT_PROBES`.
- Sin Docker socket / privileged / egreso.

El job `Start-Job` de PowerShell quedó **deprecado** y ya no es el control primario.

## Fail-safe

Si el watchdog no está healthy, los runners cancelan con `Assert-LabWatchdogHealthyOrCancel`.

## Residual

Un kill extremo del daemon Docker detiene todo el laboratorio (incluido el watchdog). Eso es fuera del modelo de amenaza del TTL de experimento.
