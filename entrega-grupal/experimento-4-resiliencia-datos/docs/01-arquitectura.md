# Arquitectura del laboratorio — Experimento 4

Laboratorio Docker Compose **aislado** para medir RPO/RTO con MySQL sintético.

## Componentes

| Servicio | Rol | Red |
|---|---|---|
| `mysql` | Datos sintéticos `lab_resilience_db` | `lab_data` (internal) |
| `generator` | Escrituras con `commit_id` + UTC + `run_id` | `lab_data` |
| `backup` | `mysqldump --single-transaction` + SHA256 | `lab_data` |
| `restore` | Restore + verify + fault lógico | `lab_data` |
| `monitor` | Alertas desde `events.jsonl` | `lab_ops` |
| `watchdog` | TTL → STOP | `lab_ops` |

## Aislamiento

- Proyecto Compose: `seguridad-caos-exp4`.
- **Sin** publicación de puertos al host.
- Redes `internal: true`.
- Volumen propio `seguridad-caos-exp4_mysql_data`.
- Credenciales sintéticas (`lab-exp4-*-not-real`).
- **No** usa Hotel OKE, Hotel MySQL, Sports, Cine ni observabilidad compartida.

## Compatibilidad OCI

El mismo Compose se ejecutó el 2026-11-18 en una **VM OCI independiente** (no `hotel-oke`) con Docker. El diseño previo lo dejaba como paso futuro; esa corrida ya ocurrió. Object Storage sería opcional como destino de copias sanitizadas de dumps; no es requisito para falsar RPO/RTO.
