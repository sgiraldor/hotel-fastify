# Procedimientos R0 / R1

**NO ejecutar hasta autorización expresa.** Los scripts están preparados; Fase 2 no los corre.

## Condición adversa (común)

- Origen: `client-unauthorized` (`172.30.20.40`) → gateway `172.30.20.20:3306`
- Legítimo: `172.30.30.30` → gateway `172.30.30.20:3306`
- Destino de datos: MySQL `172.30.10.10` **solo** alcanzable por el gateway (`lab_data`)
- Misma sonda; solo cambia la política

## Criterios de evidencia (H1)

| Escenario | Esperado sonda unauthorized | Esperado gateway | Esperado detector |
|---|---|---|---|
| R0 | `tcp_connected=true`, `mysql_greeting_received=true`, `access_blocked=false` | `connection_allowed` | sin alerta deny |
| R1 | `tcp_connected` puede ser true; `mysql_greeting_received=false`; `access_blocked=true` | `connection_denied` | alerta `unauthorized_access_denied` |

Legítimo en ambos: greeting MySQL recibido.

## Ejecución autorizada (futura)

```powershell
.\seguridad-caos-exp2\scripts\init-runtime.ps1
# Pre-pull/build de imágenes CON red (antes de depender de internal:true en runtime)
docker compose -p seguridad-caos-exp2 -f seguridad-caos-exp2/docker-compose.yml build
docker pull mysql:8.4

.\seguridad-caos-exp2\scripts\run-r0.ps1 -Authorized -MaxMinutes 30
.\seguridad-caos-exp2\scripts\run-r1.ps1 -Authorized -MaxMinutes 30
```

Cada runner: aplica política, `run_id`, TTL job, sondas lab-only, evidencias, métricas filtradas, `stop-experiment` en `finally`.
