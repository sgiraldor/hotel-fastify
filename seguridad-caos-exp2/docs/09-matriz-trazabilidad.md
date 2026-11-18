# Matriz de trazabilidad — post R0/R1

Estado actualizado tras las ejecuciones oficiales del laboratorio Docker aislado `seguridad-caos-exp2`.

| Campo | Valor |
|---|---|
| R0 oficial | `r0-20261118T051339Z` |
| R1 oficial | `r1-20261118T051805Z` |
| R1 parcial (incidente) | `r1-20261118T051705Z-PARTIAL-ABORT` |
| Paquete público | [`../evidencias-publicas/`](../evidencias-publicas/) |
| Auditoría final | [`15-auditoria-final-r0-r1.md`](15-auditoria-final-r0-r1.md) |
| Veredicto | **VÁLIDO CON LIMITACIONES** |

> **Alineación ≠ certificación.** Las referencias ISO/NIST/MITRE son de diseño y trazabilidad académica. No se afirma cumplimiento certificado ni hardening de OKE.

---

## 1. Controles del laboratorio

| ID | Control | Artefacto | Evidencia | Estado |
|---|---|---|---|---|
| G1 | Deny de reenvío L4 (política restrictiva) | `policy/r1-restrictive.yaml`, `gateway/gateway.py` | R1 `connection_denied`, `upstream_opened=false`, greeting no auth = false | **Implementado y probado** |
| G2 | Detección como código independiente de la sonda | `detector/rules/unauthorized_deny.yaml`, `detector/detector.py` | R1 alerta `unauthorized_access_denied` correlacionada | **Implementado y probado** |
| H1 | Distinguir TCP vs greeting vs auth vs datos | `clients/probe.py`, docs/01 | R0/R1 probes + notes en metrics | Cumplido |
| H2 | STOP unificado | `runtime/events` montado, `scripts/stop-experiment.ps1` | `STOP.txt` en packs R0/R1 públicos | Cumplido |
| H3 | Permisos montajes / usuario no root de servicio | entrypoints `gosu` 10001, docs/12 | Smoke + runs R0/R1 | Cumplido |
| H4 | Métricas por `run_id`/`scenario`/`policy_id` | `scripts/compute-metrics.py` | `metrics.json` R0/R1 | Cumplido |
| H5 | Runners autorizados | `scripts/run-r0.ps1`, `run-r1.ps1` | journals R0/R1 | Cumplido |
| H6 | TTL / watchdog autónomo | `watchdog/`, docs/13–14 | `watchdog.jsonl` R0/R1; TTL expiry **no** evidenciado en oficiales | Cumplido con limitaciones |
| H7 | Redes `internal:true` | `docker-compose.yml` | compose + arquitectura | Cumplido |
| H8 | Anti-bypass MySQL (solo `lab_data`) | compose | R0/R1 path vía gateway | Cumplido |
| H9 | Precisión (no reportar como OKE) | docs/10, README | Limitaciones visibles | Cumplido |
| — | No impacto DevOps | solo `seguridad-caos-exp2/` | Git: HEAD = `v1.2.0` | Cumplido |

---

## 2. Resultados experimentales verificados

| Métrica | R0 | R1 | Notas |
|---|---|---|---|
| TCP no autorizado al gateway | true | true | Handshake con el proxy |
| Greeting MySQL no autorizado | true | false | Path MySQL vía proxy |
| `connection_denied` | false | true | G1 |
| Alerta de ataque | false | true | G2 (`unauthorized_access_denied`) |
| Contención | not_observed | **preventive** | Deny pre-upstream |
| Contención reactiva | false | false | No modelada |
| MTTD | null | **20 ms** (n=1) | t1 − t0 |
| Bloqueo preventivo | null | **5 ms** (n=1) | t2 − t0; campo JSON `mttc_ms` = preventivo, **no** MTTC reactivo |
| MTTC reactivo | no_observed | **no aplica** | — |
| Cobertura detección | **0/1** | **1/1** | Una muestra por ronda |
| FP legítimo | 0 | 0 | Sin alerta de ataque al legítimo |
| Continuidad legítima | true | true | Greeting OK |

Paquete público (sanitizado):  
[`../evidencias-publicas/r0/r0-20261118T051339Z/`](../evidencias-publicas/r0/r0-20261118T051339Z/) ·  
[`../evidencias-publicas/r1/r1-20261118T051805Z/`](../evidencias-publicas/r1/r1-20261118T051805Z/) ·  
[`../evidencias-publicas/r1/r1-20261118T051705Z-PARTIAL-ABORT/`](../evidencias-publicas/r1/r1-20261118T051705Z-PARTIAL-ABORT/)

Originales locales (no versionados): `../evidencias/` — ver [`../evidencias-publicas/SANITIZATION-MANIFEST.json`](../evidencias-publicas/SANITIZATION-MANIFEST.json).

---

## 3. MITRE ATT&CK / D3FEND

| Framework | ID | Relación | Estado |
|---|---|---|---|
| ATT&CK | T1046 Network Service Discovery | Sonda TCP hacia servicio de datos vía path de red | Aplicable al intento |
| ATT&CK | T1190 Exploit Public-Facing Application | Analogía débil; sin explotación MySQL | **Pendiente / no afirmar** |
| D3FEND | D3-NI Network Isolation | Bridges internal + `lab_data` | Alineación de diseño |
| D3FEND | D3-ITF Inbound Traffic Filtering | Deny de orígenes en proxy L4 (post-accept) | Alineación con salvedad |
| D3FEND | D3-NTA Network Traffic Analysis | Eventos/alertas gateway→detector | Alineación de telemetría |

---

## 4. ISO/IEC 27001:2022 y NIST

| Estándar | Control / concepto | Relación | Estado |
|---|---|---|---|
| ISO/IEC 27001:2022 | A.8.20 Network security | Aislamiento + punto de control | Alineación documental |
| ISO/IEC 27001:2022 | A.8.16 Monitoring activities | Eventos UTC + detector | Alineación documental |
| ISO/IEC 27001:2022 | A.8.22 Segregation of networks | attacker / clients / data | Alineación de lab |
| NIST SP 800-53 Rev. 5 | SC-7 Boundary Protection | Gateway como frontera lógica | Alineación de diseño |
| NIST SP 800-53 Rev. 5 | SI-4 System Monitoring | Alertas sobre denies | Alineación de diseño |
| NIST SP 800-53 Rev. 5 | AC-4 Information Flow Enforcement | Política allow/deny de reenvío | Alineación de diseño |
| NIST SP 800-207 | Zero Trust | Analogía (verify / least privilege) | **Pendiente** evaluación formal ZT |

---

## 5. Pendiente (explícito)

- Cruce formal con evidencias Sports AWS / Cine GCP (integración grupal).
- Evaluación Zero Trust NIST SP 800-207 a nivel arquitectura multinube completa.
- Tendencias sectoriales adicionales **solo** con evidencia de equipo.
- Puente autorizado futuro a CNI/NetworkPolicy en OKE (fuera de este laboratorio).
- ATT&CK T1190: no usar como técnica ejecutada.

---

## 6. Alcance negativo (no logrado / no pretendido)

- No se aplicó NetworkPolicy en OCI/OKE.
- No se segmentó el clúster de producción.
- No se bloqueó el handshake TCP previo al gateway (deny post-accept / sin upstream).
- No hubo acceso no autorizado a datos MySQL autenticados en R0 (solo greeting).
- No hubo contención reactiva post-alerta en R1.
- Métricas n=1: no son promedios ni SLA.
