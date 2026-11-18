# OCI Bastion = Free (Oracle Security pricing). No jump host propio.
# Requiere target en subnet privada + plugin Bastion en la instancia.

resource "oci_bastion_bastion" "exp4" {
  count                        = local.use_bastion ? 1 : 0
  name                         = local.name_bastion
  bastion_type                 = "STANDARD"
  compartment_id               = var.compartment_ocid
  target_subnet_id             = one(oci_core_subnet.private[*].id)
  client_cidr_block_allow_list = [var.ssh_authorized_cidr]
  # Límite OCI Bastion STANDARD: máx. 10800s (3h) por sesión SSH.
  # La infra Exp4 vive ≥9h; el operador renueva sesiones Bastion dentro de esa ventana.
  # Este TTL de sesión ≠ TTL del experimento ≠ auto-destroy de la VM.
  max_session_ttl_in_seconds = 10800
  freeform_tags              = local.tags
}
