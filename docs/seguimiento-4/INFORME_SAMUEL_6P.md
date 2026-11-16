# Aporte Samuel — borrador para informe grupal (máx. 6 páginas)

## 1. Contexto
Hotel API en Fastify/TypeScript/MySQL. Rol: dependencia síncrona de Sports en el flujo E2E multicloud.

## 2. Implementación
- Contrato `GET /api/v2/habitacion/:id` + `x-trace-id` + OTel.
- Health `/live` `/ready`.
- K8s 2 réplicas (manifiestos).
- Caos: interruptor tokenizado + Chaos Toolkit.
- Resiliencia: fail-fast + bulkhead (`RESILIENCE_MODE`).
- Observabilidad: `/metrics`, `/metrics/prometheus`, dashboard Grafana importable.

## 3. Experimento
Hipótesis de indisponibilidad; steady-state; R0 vs R1 con mismo perfil local provisional.

## 4. Resultados
*(Pegar aquí solo métricas reales de `scripts/experiments/results/`. Si cloud pendiente, declararlo.)*

## 5. Limitaciones
Sin apply OCI/OKE en esta entrega local. Mejora de success-rate E2E depende de Sports.

## 6. Uso de IA
Asistente Cursor usado para auditoría, implementación y documentación; validación con `npm test`/`tsc`.
