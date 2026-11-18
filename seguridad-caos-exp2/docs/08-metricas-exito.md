# Métricas y criterios de éxito

## Aislamiento por ronda (H4)

Toda métrica se calcula con filtro obligatorio:

- `run_id`
- `scenario` (`r0`|`r1`)
- `policy_id`

Eventos de otras rondas se ignoran. Duplicados por `event_id` se deduplican. Fuera de orden: se elige el evento más reciente por `timestamp_utc` dentro del scope.

## Campos

| Campo | Significado |
|---|---|
| t0 | `connection_attempt` unauthorized (UTC real) |
| t1 | alerta `unauthorized_access_denied` (UTC) |
| t2 | `connection_denied` (UTC) — contención preventiva |
| MTTD | t1−t0 o `null` |
| MTTC | t2−t0 o `null` |
| containment_class | `preventive` \| `not_observed` |
| containment_reactive | siempre `false` en este lab |

## Señales de sonda (no confundir)

- `tcp_connected` ≠ acceso a MySQL
- `mysql_greeting_received` = path de reenvío abierto
- `access_blocked` = sin greeting tras TCP al proxy
