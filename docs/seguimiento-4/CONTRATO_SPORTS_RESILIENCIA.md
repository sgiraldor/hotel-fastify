# Contrato para Jarrison (Sports) — resiliencia del caller

Hotel implementa fail-fast/bulkhead como **callee**. Para tolerancia E2E, Sports debe:

1. Timeout de cliente HTTP hacia Hotel (sugerido 2–3 s).
2. Circuit breaker al detectar ráfaga de 503/504.
3. Retry con backoff+jitter **solo** si es idempotente y el CB lo permite.
4. No contar 503 de Hotel como éxito del flujo.
5. Propagar siempre `x-trace-id`.
6. Para Chaos Gate: usar `CHAOS_LAB_TOKEN` + `/api/v2/chaos/dependency` enable/disable.

Este archivo no modifica el repo de Sports.
