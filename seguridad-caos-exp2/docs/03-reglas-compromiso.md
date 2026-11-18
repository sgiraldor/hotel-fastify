# Reglas de compromiso (RoE)

1. **Ámbito**: únicamente recursos con nombre/proyecto `seguridad-caos-exp2`.
2. **Prohibido**: tocar Hotel OCI, Sports AWS, Cine GCP, OKE, Terraform, GitHub Actions, observabilidad compartida.
3. **Prohibido**: credenciales reales, IPs públicas del DevOps, endpoints cloud.
4. **Prohibido** en Fase 1: `docker compose up`, ataque real, R0/R1 ejecutados, commit/push sin autorización.
5. **Condición adversa permitida**: un cliente no autorizado intenta TCP al puerto MySQL **a través del gateway** del laboratorio.
6. **No** se autoriza explotación de vulnerabilidades MySQL, RCE, ni movimiento lateral fuera del lab.
7. **TTL**: máximo de ejecución operativa documentado (default 30 min en `stop-experiment.ps1`).
8. **Parada**: cualquier operador puede invocar el interruptor; se restaura política R0.
9. **Limpieza**: solo `docker compose -p seguridad-caos-exp2 ...`; nunca `docker system prune` ni limpiezas globales.
10. **Representatividad**: resultados del lab no se reportan como endurecimiento de OKE.
