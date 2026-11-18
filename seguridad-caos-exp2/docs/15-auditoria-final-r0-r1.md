# Auditoría final R0 / R1 — seguridad-caos-exp2

**Fecha de auditoría (UTC de generación del informe):** 2026-11-18 (fase 7, solo lectura).  
**Repositorio:** hotel-fastify.  
**Rama auditada:** `feat/defensa-profundidad-oci`.  
**HEAD / tag v1.2.0:** `0ce0e41d81b2d7ae9d6357f00585f2a44a528ce1`.  
**Alcance:** laboratorio local Docker; **no** es auditoría de OKE/OCI/AWS/GCP en vivo.

**Evidencias oficiales auditadas (originales locales sin modificación):**

| Ronda | Original local (no versionado) | Paquete público sanitizado |
|---|---|---|
| R0 | `evidencias/r0/r0-20261118T051339Z/` | [`evidencias-publicas/r0/r0-20261118T051339Z/`](../evidencias-publicas/r0/r0-20261118T051339Z/) |
| R1 oficial | `evidencias/r1/r1-20261118T051805Z/` | [`evidencias-publicas/r1/r1-20261118T051805Z/`](../evidencias-publicas/r1/r1-20261118T051805Z/) |
| R1 parcial | `evidencias/r1/r1-20261118T051705Z-PARTIAL-ABORT/` | [`evidencias-publicas/r1/r1-20261118T051705Z-PARTIAL-ABORT/`](../evidencias-publicas/r1/r1-20261118T051705Z-PARTIAL-ABORT/) |

Manifiesto SHA256 / sanitización: [`evidencias-publicas/SANITIZATION-MANIFEST.json`](../evidencias-publicas/SANITIZATION-MANIFEST.json).

---

## 1. Resumen ejecutivo

El experimento individual de exposición y control de acceso L4 en laboratorio demuestra, con evidencias JSONL/UTC correlacionadas:

- **R0 (baseline permisiva):** el cliente no autorizado obtiene path MySQL vía gateway (`connection_allowed` + greeting). No hay alerta de ataque ni contención. El cliente legítimo permanece operativo.
- **R1 (restrictiva):** misma topología/método; el gateway deniega el reenvío (`connection_denied`, `upstream_opened=false`); la sonda no recibe greeting MySQL; el detector emite `unauthorized_access_denied` correlacionada al deny; el legítimo sigue con greeting.

**Veredicto global del experimento:** **VÁLIDO CON LIMITACIONES**.

Limitaciones principales: control por proxy L4 post-accept (no drop pre-handshake / no NetworkPolicy OKE); MTTD/MTTC de **una** ejecución (no promedio estadístico); laboratorio ≠ producción multinube.

---

## 2. Cronología (timestamps UTC de evidencias)

| UTC | Evento | Fuente |
|---|---|---|
| 05:13:39.647Z | Inicio R0 `r0-20261118T051339Z` | `r0/.../journal.txt` |
| 05:13:50.871Z | Gateway boot R0 | `r0/.../events.jsonl` |
| 05:13:54.802Z | t0 R0 attempt unauthorized | `events.jsonl` |
| 05:13:54.809Z | R0 `connection_allowed` unauthorized | `events.jsonl` |
| 05:13:58.656–.660Z | R0 attempt/allow legitimate | `events.jsonl` |
| 05:14:01–05:14:05Z | STOP `end_of_r0` + rollback | journal / final-state |
| 05:17:05.915Z | Inicio R1 parcial `r1-20261118T051705Z` | INCIDENT + events parcial |
| 05:17:20.673–.677Z | Deny unauthorized (parcial) | parcial `events.jsonl` |
| 05:17:20.991Z | STOP `end_of_r1` tras abort runner | parcial `STOP` |
| 05:18:05.926Z | Inicio R1 oficial `r1-20261118T051805Z` | `r1/.../journal.txt` |
| 05:18:21.270Z | t0 R1 attempt | `events.jsonl` |
| 05:18:21.275Z | t2 R1 `connection_denied` | `events.jsonl` |
| 05:18:21.290Z | t1 R1 alerta ataque | `alerts.jsonl` |
| 05:18:25.089–.095Z | R1 allow legitimate | `events.jsonl` |
| 05:18:30.718Z | STOP `end_of_r1` oficial | `r1/.../STOP.txt` |
| 05:18:34.569Z | Rollback R1 completado | journal |

---

## 3. Resultados R0 (auditoría)

| Control | Hallazgo | Evidencia |
|---|---|---|
| `run_id` | `r0-20261118T051339Z` | events/alerts/metrics/probes |
| `policy_id` | `seguridad-caos-exp2-r0-permissive` | events + `active-policy.yaml` |
| Intento no autorizado | `src_ip=172.30.20.40`, dst MySQL `:3306` vía gateway | `evt-50b22f8f0db3-58578` |
| `connection_attempt` | Sí, `action=allow`, `default_allow` | events |
| `connection_allowed` | Sí, `upstream_opened=true`, `mysql_forwarding=true` | `...-allow` |
| Sonda unauthorized | `tcp_connected=true`, `mysql_greeting_received=true`, `access_blocked=false` | `probes/probe-unauthorized-r0-...json` |
| Alerta de seguridad | **No** (`detector_started` ≠ ataque) | alerts.jsonl |
| Contención | **No observada** | metrics: `t1/t2/mttd/mttc=null` |
| Legítimo | greeting OK | events + probe legitimate r0 |
| STOP/rollback | `end_of_r0`; lab stopped; política R0 | journal + final-state |

**Demostrado en R0:** exposición TCP/MySQL vía proxy bajo política permisiva; continuidad legítima; ausencia de detección/contención de amenaza no autorizada.

**No demostrado en R0:** bloqueo, alerta de ataque, endurecimiento OKE.

---

## 4. Resultados R1 oficial (auditoría)

| Control | Hallazgo | Evidencia |
|---|---|---|
| `run_id` | `r1-20261118T051805Z` (exclusivo) | events/alerts/metrics |
| Política | `seguridad-caos-exp2-r1-restrictive` | events + policy copy |
| Misma condición que R0 | origen `172.30.20.40`, target `172.30.20.20:3306`, MySQL `172.30.10.10:3306`, 1+1 sondas | journal + probes |
| `connection_attempt` | deny / `explicit_deny` | `evt-1c56c6253b97-52264` @ 05:18:21.270Z |
| `connection_denied` | Sí; `upstream_opened=false`; `mysql_forwarding=false`; `containment=preventive` | `...-deny` @ 05:18:21.275Z |
| Sonda unauthorized | `tcp_connected=true`, **`mysql_greeting_received=false`**, **`access_blocked=true`** | probe r1 unauthorized |
| Alerta ataque | `unauthorized_access_denied` | `alert-evt-1c56c6253b97-52264-deny` @ 05:18:21.290Z |
| Correlación | `correlated_event_id` = deny event_id; `correlated_attempt_id` = attempt; mismo `run_id`/`src_ip` | alerts.jsonl |
| Legítimo | allow + greeting | events + probe r1 legitimate |
| STOP/rollback | `end_of_r1`; política restaurada R0; lab stopped | STOP.txt + final-state |

**Nota:** `detector_started` (`detector-boot-1794979097`) **no** es detección del ataque.

---

## 5. Métricas recalculadas (desde timestamps originales)

### R0 (`r0-20261118T051339Z`)

| Métrica | Valor recalculado | Base |
|---|---|---|
| t0 | `2026-11-18T05:13:54.802Z` | `connection_attempt` unauthorized |
| t1 | **no_observed** (`null`) | sin `unauthorized_access_denied` |
| t2 | **no_observed** (`null`) | sin `connection_denied` |
| MTTD | **no_observed** | no inventar 0 |
| Bloqueo preventivo | **no_observed** | — |
| MTTC reactivo | **no_aplica / no_observed** | diseño sin contención reactiva |
| Cobertura detección | `false` | deny∧alerta ausentes |
| FP legítimo | `false` | sin alerta a `172.30.30.30` |

### R1 (`r1-20261118T051805Z`) — verificación de t0/t1/t2 reportados

| Campo reportado | Valor en evidencia primaria | Misma ejecución / correlación |
|---|---|---|
| t0 `05:18:21.270Z` | `connection_attempt` `evt-1c56c6253b97-52264`, `run_id=r1-20261118T051805Z`, `src_ip=172.30.20.40` | Confirmado |
| t2 `05:18:21.275Z` | `connection_denied` `evt-1c56c6253b97-52264-deny`, `correlated_attempt_id=evt-1c56c6253b97-52264` | Confirmado |
| t1 `05:18:21.290Z` | alerta `alert-evt-1c56c6253b97-52264-deny`, `correlated_event_id=...-deny` | Confirmado |

**Recálculo:**

| Métrica | Valor | Interpretación |
|---|---|---|
| MTTD | **20 ms** = t1 − t0 | Latencia de **detección** (alerta). **Una sola ejecución**, no promedio. |
| Tiempo hasta bloqueo preventivo | **5 ms** = t2 − t0 | Deny del gateway **antes** de abrir upstream |
| MTTC reactivo | **no_observed / N/A** | No hubo remediación posterior a la detección |
| Contención preventiva | **sí** (`containment_class=preventive`) | **t2 ocurre antes de t1** |
| Cobertura | `true` | deny + alerta correlacionada |
| FP | `false` | allow legítimo sin alerta de ataque |

**Advertencia metodológica:** MTTD=20 ms y bloqueo=5 ms son observaciones de **n=1**. No deben presentarse como media, percentil ni SLA.

---

## 6. Evidencia de G1 y G2

### G1 — Control restrictivo de reenvío (gateway L4)

| Aspecto | Contenido |
|---|---|
| Control | Política `r1-restrictive` + deny por IP en proxy |
| Evidencia R0 | Allow + greeting (baseline de exposición) |
| Evidencia R1 | `connection_denied`, `upstream_opened=false`, sonda `access_blocked=true` |
| Resultado | Bloqueo preventivo de path MySQL medido |
| Limitación | Handshake TCP al gateway aún posible (post-accept) |
| Riesgo residual | No equivale a NetworkPolicy/CNI en OKE |

### G2 — Detección como código sobre eventos del gateway

| Aspecto | Contenido |
|---|---|
| Control | Regla `seguridad-caos-exp2-unauthorized-deny-v1` |
| Evidencia R0 | Solo `detector_started` (sin alerta de ataque) |
| Evidencia R1 | `unauthorized_access_denied` independiente de la sonda |
| Resultado | Detección correlacionada en 20 ms (n=1) |
| Limitación | Cubre denies emitidos por este gateway; no tráfico que no pase por él |
| Riesgo residual | No sustituye SIEM/OTel de producción |

**Aclaración obligatoria:** el laboratorio **no** implementa NetworkPolicy real sobre el OKE de OCI. Flannel sin enforcement efectivo permanece como hallazgo de arquitectura real, fuera del alcance de este lab.

---

## 7. Detección como código — pruebas positivas/negativas

**Regla versionada:** `detector/rules/unauthorized_deny.yaml` (`rule_id=...-v1`, v1.1.0).

| Tipo | Definición | Resultado en R1 runtime | Distinción |
|---|---|---|---|
| Positiva | `connection_denied` + `172.30.20.40` → alerta | PASS (`rule-positive-negative.json` + alerts.jsonl) | Evento **observado** en R1, no solo fixture |
| Negativa | `connection_allowed` legítimo → sin alerta ataque | PASS | Evento **observado** en R1 |
| Fixtures unitarios | `tests/fixtures/*` + pytest | Validados en fases previas | **No** sustituyen R1 |

Independencia: alerta declara `detection_source=gateway_events`, `independent_of_probe=true`.  
FP observados en R1: ninguno sobre legítimo.  
Cobertura: solo orígenes en `watch_sources` y eventos `connection_denied`.

---

## 8. Análisis del intento parcial R1

| Campo | Hallazgo |
|---|---|
| Identificador | `r1-20261118T051705Z` |
| Conservación | `evidencias/r1/r1-20261118T051705Z-PARTIAL-ABORT/` + `INCIDENT.txt` |
| Causa del abort | Runner trataba `docker compose run` exit=1 (sonda `access_blocked`) como fallo de infraestructura |
| Qué alcanzó a ejecutarse | Watchdog, MySQL, gateway, detector, **1 sonda unauthorized** con deny real |
| Evidencias parciales | `connection_attempt`/`connection_denied`; probe unauthorized blocked; **sin** sonda legítima; alerta ataque **no** emitida a tiempo (parada inmediata) |
| Corrección | `Invoke-LabProbe` acepta exit 0/1/2 como resultado experimental |
| Método de la R1 oficial | Misma topología, IPs, puerto, sonda, 1+1 intentos; política R1; runner corregido |
| ¿Presentar 2ª como oficial? | **Sí**, con transparencia del incidente parcial en la cronología del game day |

---

## 9. Análisis watchdog exit 137

| Pregunta | Conclusión basada en evidencia |
|---|---|
| ¿En qué contexto aparece 137? | Contenedor `seguridad-caos-exp2-watchdog` visto `Exited (137)` en preflight R1 (`r1/preflight-.../containers.txt`) y tras paradas `docker stop`/`compose stop` |
| ¿TTL vencido en R0/R1? | **No evidenciado.** Deadlines R0 `05:43:43Z` y R1 oficial `05:48:09Z`; mediciones ~05:13–05:18. No hay `watchdog_stop_activated`/`deadline_expired` en journals R0/R1 oficiales |
| ¿Antes o después de mediciones? | El 137 observado en preflight R1 es **posterior** a mediciones R0 y **anterior** a R1 oficial (estado residual). En R1 oficial, heartbeat sano a `05:18:30.485Z` **después** de t0/t1/t2 |
| ¿Afecta validez R1? | **No** invalida t0/t1/t2 ni G1/G2 de `r1-20261118T051805Z` |
| ¿Parada segura? | STOP `end_of_r1` + `compose stop` verificaron lab stopped; 137 es coherente con SIGKILL de stop Docker, no con fallo de medición |
| Si falta detalle del proceso kill | Parte del encadenamiento exacto SIGTERM→SIGKILL queda **no determinado** a nivel de dmesg/runtime Docker; la ausencia de TTL expiry sí está evidenciada |

---

## 10. STOP y rollback

| Ronda | STOP | Política final | Lab running | Otros proyectos (documentado al cierre) |
|---|---|---|---|---|
| R0 | `end_of_r0` | R0 permissive | vacío | hotel-* listados intactos en final-state |
| R1 oficial | `end_of_r1` | R0 permissive | vacío | hotel-* listados intactos en final-state |

No se ejecutó `docker system prune` según procedimientos documentados.

---

## 11. Riesgos residuales

1. TCP handshake al gateway permanece posible bajo deny (no es drop pre-handshake).
2. Bypass de clientes fuera del path del gateway no cubierto si se rompe el aislamiento de redes.
3. Métricas n=1 (no estadística).
4. Detector depende de eventos del gateway; silencio del gateway = silencio de G2.
5. Representatividad limitada frente a OKE/Flannel/producción.
6. Evidencias de probes en carpetas R0/R1 incluyen archivos históricos de smoke/parciales en el directorio `probes/` por copia de volumen; **la correlación válida es por `run_id` en el JSON**, no por listado crudo del directorio.

---

## 12. Limitaciones frente al OKE real

- No se aplicaron NetworkPolicies en el clúster OCI.
- No se modificó CNI Flannel ni security lists/NSG.
- No se valida aquí el estado actual de Sports AWS, Hotel OCI o Cine GCP (sin evidencia cloud reciente en esta fase).
- El lab demuestra **aislamiento Docker + proxy L4 + detección por eventos**, transferible como diseño, no como certificación de producción.

---

## 13. Protección DevOps / Git (estado al auditar)

| Ítem | Valor |
|---|---|
| Rama | `feat/defensa-profundidad-oci` |
| HEAD | `0ce0e41d81b2d7ae9d6357f00585f2a44a528ce1` |
| Tag `v1.2.0` | Anotado → mismo commit |
| Cambios fuera de `seguridad-caos-exp2/` | Ninguno observado (`git status` solo `?? seguridad-caos-exp2/`) |
| Commit/push de esta auditoría | No realizados |

**No se afirma** salud actual de los tres servicios cloud: solo se constata que el experimento no los modificó según alcance y estado Git.

---

## 14. Referencias exactas a evidencias

**Originales locales (intactos, excluidos de Git):** `evidencias/r0/r0-20261118T051339Z/`, `evidencias/r1/r1-20261118T051805Z/`, `evidencias/r1/r1-20261118T051705Z-PARTIAL-ABORT/`.

**Paquete público sanitizado (versionable):**

- R0: [`evidencias-publicas/r0/r0-20261118T051339Z/`](../evidencias-publicas/r0/r0-20261118T051339Z/)
- R1: [`evidencias-publicas/r1/r1-20261118T051805Z/`](../evidencias-publicas/r1/r1-20261118T051805Z/)
- Parcial: [`evidencias-publicas/r1/r1-20261118T051705Z-PARTIAL-ABORT/`](../evidencias-publicas/r1/r1-20261118T051705Z-PARTIAL-ABORT/)
- Regla: `detector/rules/unauthorized_deny.yaml`
- Políticas: `policy/r0-permissive.yaml`, `policy/r1-restrictive.yaml`

---

## 15. Veredictos

| Ámbito | Veredicto |
|---|---|
| **R0** | **VÁLIDO** como baseline de exposición (con limitaciones de lab) |
| **R1** | **VÁLIDO CON LIMITACIONES** (proxy L4 post-accept; n=1; no OKE) |
| **Experimento R0→R1 (G1+G2)** | **VÁLIDO CON LIMITACIONES** |
| **R1 parcial** | Incidente operativo documentado; **no** sustituye a R1 oficial |
| **Watchdog 137** | No invalida R1; TTL expiry en R0/R1 **no evidenciado**; causa fina del kill Docker **parcialmente no determinada** |

---

*Documento generado en fase 7 de auditoría. No modifica JSON/journals/logs originales.*
