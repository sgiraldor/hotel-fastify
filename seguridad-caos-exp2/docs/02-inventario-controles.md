# Inventario de controles (post Fase 2)

| ID | Control | Implementación | Estado |
|---|---|---|---|
| C1 | Proxy L4 allow/deny | `gateway` + policy YAML | Código |
| C2 | Aislamiento Docker internal | `lab_data`/`lab_clients`/`lab_attacker` | Código |
| C3 | Anti-bypass MySQL | MySQL solo en `lab_data` con gateway | Código |
| C4 | Eventos auditables | `events.jsonl` + run_id/scenario/policy_id | Código |
| C5 | Detección como código | regla unauthorized_deny | Código |
| C6 | STOP unificado | `runtime/events/STOP` ↔ `/events/STOP` | Código (verify estático) |
| C7 | TTL | Start-Job → STOP | Código (limitación sesión PS) |
| C8 | Rollback acotado | stop-experiment sin prune; destroy opt-in | Código |
| C9 | Mínimo privilegio MySQL | lab_readonly / lab_denied | Preparado (no eje R0/R1) |
| C10 | Sonda H1 | tcp / greeting / access_blocked | Código |
