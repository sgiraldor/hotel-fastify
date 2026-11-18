# Permisos y montajes (H2 / H3)

## Identidades

| Componente | UID runtime | Mecanismo |
|---|---|---|
| gateway | 10001 (`labuser`) | entrypoint root → `chown /events` → `gosu 10001` |
| detector | 10001 | igual |
| clients | 10001 | `USER 10001:10001` en imagen |
| mysql | imagen oficial | sin cambio |

No se usa `chmod 777`. El proceso de aplicación **no** permanece como root.

## Montajes

| Ruta host | Contenedor | Modo | Uso |
|---|---|---|---|
| `./policy` | `/policy` | ro | Políticas R0/R1 |
| `./runtime/events` | `/events` | rw (gw/det), ro (clients) | events.jsonl, alerts.jsonl, **STOP**, run_context.json |
| `./runtime/evidence` | `/evidence` | rw | Salida de sondas |
| `./detector/rules` | `/rules` | ro | Regla de detección |
| volumen `mysql_data` | `/var/lib/mysql` | rw | Solo datos sintéticos del lab |

## Interruptor STOP unificado

- Host: `seguridad-caos-exp2/runtime/events/STOP`
- Contenedores: `/events/STOP` (`STOP_FLAG`)
- Misma ruta vía bind mount del laboratorio únicamente.

## Nota Docker Desktop (Windows)

En bind mounts de Docker Desktop, `chown` puede ser no-op. Aun así el entrypoint intenta alinear ownership; la escritura suele funcionar porque el filesystem virtualizado permite al UID 10001 escribir. Validación runtime pendiente (no ejecutada en Fase 2).
