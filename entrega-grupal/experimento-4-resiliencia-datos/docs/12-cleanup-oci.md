# Limpieza OCI Exp4 (diseño — NO ejecutar ahora)

## Cuándo

Solo **después** de la sustentación y con **autorización expresa**.  
La infra debe haber cubierto **≥9 h** de disponibilidad. Cleanup ≠ TTL del experimento.

## Reglas

1. Inventariar recursos con tag `experimento=seguridad-caos-exp4`.
2. Para cada candidato, verificar **OCID** + display-name + tags.
3. Eliminar **uno por uno** tras confirmación.
4. **Prohibido:** `delete` masivo por substring, por región entera o por compartimento completo.
5. **Prohibido:** tocar `hotel-oke`, `hotel-vcn`, NLB/IP Hotel, MySQL Hotel, observabilidad compartida, `seguridad-caos-exp2`.
6. **Prohibido:** programar auto-destroy a las 9 h / 12 h.
7. Antes de destruir: exportar backups, logs y evidencias fuera de la VM.

## Secuencia propuesta (post-autorización)

1. STOP + `docker compose -p seguridad-caos-exp4 stop` en la VM (preservar volúmenes/evidencias primero).
2. Exportar evidencias fuera de la VM.
3. Terminate instancia Exp4 (OCID verificado).
4. Detach/delete block/boot volumes Exp4 (OCID verificado) — evitar huérfanos facturables.
5. Delete subnet / NSG / SL / VCN Exp4 (OCID verificado, orden inverso a creación).
6. Verificación final de integridad DevOps (solo lectura):

```bash
oci compute instance list ...   # hotel worker sigue RUNNING
oci network vcn list ...        # hotel-vcn EXISTS
oci ce cluster list ...         # hotel-oke ACTIVE
```

## Terraform

Si se usó el stack con `enable_exp4_oci=true` (solo tras autorización de apply previa y **nueva** autorización de destroy):

```bash
# Solo con autorización POST-sustentación y state Exp4 aislado
terraform destroy  # scoped al state de oci/terraform Exp4
```

Default del esqueleto es `enable_exp4_oci=false` (cero recursos).  
No hay `terraform destroy` automático ligado a `oci_min_availability_hours`.
