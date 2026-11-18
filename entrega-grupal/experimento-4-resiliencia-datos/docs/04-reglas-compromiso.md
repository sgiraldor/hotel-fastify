# Reglas de compromiso (RoE)

1. Alcance: únicamente proyecto `seguridad-caos-exp4` / carpeta `entrega-grupal/experimento-4-resiliencia-datos/`.
2. Prohibido: Hotel OKE/MySQL/VCN/NLB, Sports AWS, Cine GCP, obs compartida, Terraform, kubectl Hotel, `main`, `v1.2.0`, `seguridad-caos-exp2/` (no modificar).
3. Credenciales solo sintéticas; sin OCI/AWS/GCP keys.
4. Fallo: solo lógico sobre tablas del lab y `run_id` autorizado.
5. Prohibido: borrar datadir/volúmenes como mecanismo de falla; `docker system prune`.
6. TTL + STOP + watchdog obligatorios en ventanas **experimentales** (fallo/restore/caos). No terminan la VM OCI.
7. Vida mínima de infraestructura OCI Exp4: **≥9 horas** para R0/R1 + evidencias + sustentación; sin auto-destroy; `terraform destroy` solo con autorización post-sustentación.
8. Restore exige preflight de destino (`lab_resilience_db` + allowlist de host + `lab_meta.project`).
9. Limpieza Compose solo `docker compose -p seguridad-caos-exp4 ...`; conservar backups/evidencias tras R0/R1.
10. Resultados del lab ≠ respaldo/HA del MySQL Hotel en OCI.
