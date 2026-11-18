# Runbook cleanup Exp4 (NO ejecutar ahora — solo post-sustentación)

**Prerrequisito:** autorización expresa **después** de la sustentación.  
**No** ejecutar al cumplirse 9 h / 12 h. La VM no se auto-elimina.

1. En la VM: exportar `runtime/` y `evidencias*` fuera del host.
2. `EXP4_ALLOW_COMPOSE_STOP=1 ./scripts/stop-experiment.sh --reason cleanup` (STOP del lab; no destroy OCI).
3. `terraform output -json inventory_ocids` (state local Exp4).
4. Verificar cada OCID: tag `experimento=seguridad-caos-exp4` y display-name prefijo `seguridad-caos-exp4-`.
5. Confirmar que **no** es worker OKE / hotel-vcn / NLB Hotel / MySQL Hotel.
6. Con autorización separada post-sustentación: `terraform destroy` **solo** en `oci/terraform/` Exp4 con su state local.
7. Inventario post-destroy: sin NAT/IP/boot huérfanos Exp4.
8. Verificar Hotel: instance OKE RUNNING, hotel-vcn EXISTS, cluster ACTIVE.

Prohibido: destroy por compartimento, región o `name contains`; destroy durante la sustentación; cron de auto-terminate.
