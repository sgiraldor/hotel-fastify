# Riesgos residuales

1. Ejecutar runners contra el host equivocado si se alteran IPs/env (mitigado con allowlist + `lab_meta`).
2. Confundir RPO objetivo (intervalo) con RPO observado.
3. n=1 por ronda: no es estadística.
4. Diferencia manual/auto es parte de G2; debe declararse en sustentación.
5. Tenancy OCI compartida: riesgo de crear recursos junto a Hotel sin etiquetas (fase cloud).
6. Confundir TTL/STOP del lab con terminación de la VM (dejaría la sustentación sin infra).
7. Cleanup prematuro o `terraform destroy` antes/durante la sustentación.
8. Subestimar costo si Ampere Always Free está agotado y la infra vive ≥9–12 h (recalcular el día D; no asumir USD 5).
9. Aún no hay evidencias experimentales reales en esta fase.
