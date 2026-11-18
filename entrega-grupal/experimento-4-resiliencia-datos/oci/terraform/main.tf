# Exp4 Terraform entrypoint.
# Recursos viven en network.tf / nsg.tf / compute.tf / bastion.tf.
# DEFAULT: enable_exp4_oci=false → cero recursos.
#
# PROHIBIDO:
# - apply sin autorización
# - peering / DRG hacia hotel-vcn
# - reutilizar OCID de Hotel como destino de cambio
# - SSH 0.0.0.0/0
# - exponer MySQL 3306
