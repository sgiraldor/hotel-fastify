# Parada y rollback

## Interruptor unificado

```powershell
.\seguridad-caos-exp2\scripts\init-runtime.ps1
.\seguridad-caos-exp2\scripts\verify-stop.ps1
.\seguridad-caos-exp2\scripts\stop-experiment.ps1 -Reason operator_stop
```

`STOP` se escribe en `runtime/events/STOP` (visible como `/events/STOP` en gateway, detector y sondas).

## TTL (H6)

Los runners (`run-scenario.ps1`) lanzan un **Start-Job** de PowerShell que escribe `STOP` al vencer `MaxMinutes`, sin tocar otros proyectos Docker.

**Limitación residual:** el job TTL vive mientras la sesión PowerShell del runner sigue activa. Si el operador mata la consola de forma abrupta, el job puede morir; en ese caso usar `stop-experiment.ps1` manualmente. Durante una ejecución normal del runner, el `finally` siempre invoca la parada del lab.

## stop-experiment.ps1

1. Escribe STOP unificado.
2. Preserva copia de events/evidence en `evidencias/stop-*`.
3. Restaura política R0.
4. `docker compose -p seguridad-caos-exp2 stop` (solo este proyecto).
5. **No** ejecuta `docker system prune`.
6. `down --volumes` **solo** con `-CleanupLabOnly -ConfirmDestroyLabVolumes` (off por defecto) para no borrar evidencias/datos por accidente.

## Verificación

```powershell
.\seguridad-caos-exp2\scripts\verify-stop.ps1
# Con lab arriba (fase posterior autorizada):
# .\seguridad-caos-exp2\scripts\verify-stop.ps1 -RequireRunningContainers
```
