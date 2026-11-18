# Estado estable de seguridad

Antes de inyectar falla:

1. `docker compose ... config` válido (proyecto `seguridad-caos-exp4`).
2. MySQL healthy; `lab_meta.project = seguridad-caos-exp4`.
3. Watchdog healthy (`watchdog_heartbeat.json`).
4. Sin archivo `STOP` activo residual no justificado.
5. Dataset sintético generado con `run_id` conocido.
6. Al menos un backup con meta + SHA256 verificado.
7. Confirmado: no hay endpoints Hotel/AWS/GCP en variables.
