resource "oci_core_vcn" "exp4" {
  count          = local.enabled ? 1 : 0
  compartment_id = var.compartment_ocid
  cidr_blocks    = [var.vcn_cidr]
  display_name   = local.name_vcn
  dns_label      = "exp4lab"
  freeform_tags  = local.tags
}

resource "oci_core_internet_gateway" "exp4" {
  count          = local.enabled ? 1 : 0
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.exp4[0].id
  display_name   = local.name_igw
  enabled        = true
  freeform_tags  = local.tags
}

# NAT solo en modo bastion (egreso privado hacia Docker Hub / yum).
# Precio: sin SKU horario en price list HTML; fuentes Oracle/community 2026 indican NAT free
# (solo egreso de datos). Ver docs/13-costos-oci-exp4.md.
resource "oci_core_nat_gateway" "exp4" {
  count          = local.use_bastion ? 1 : 0
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.exp4[0].id
  display_name   = local.name_nat
  freeform_tags  = local.tags
}

resource "oci_core_route_table" "public" {
  count          = local.enabled ? 1 : 0
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.exp4[0].id
  display_name   = local.name_rt_public
  freeform_tags  = local.tags

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.exp4[0].id
    description       = "Egreso/ingreso público vía IGW (Bastion o SSH restringido)"
  }
}

resource "oci_core_route_table" "private" {
  count          = local.use_bastion ? 1 : 0
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.exp4[0].id
  display_name   = local.name_rt_private
  freeform_tags  = local.tags

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_nat_gateway.exp4[0].id
    description       = "Egreso privado vía NAT (Docker Hub, yum). Sin peering Hotel."
  }
}

resource "oci_core_subnet" "public" {
  count          = local.enabled ? 1 : 0
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.exp4[0].id
  cidr_block     = var.public_subnet_cidr
  display_name   = local.name_subnet_public
  route_table_id = oci_core_route_table.public[0].id
  # EXPLÍCITO: SL Exp4 propia — no Default Security List
  security_list_ids          = oci_core_security_list.public[*].id
  prohibit_public_ip_on_vnic = false
  dns_label                  = "exp4pub"
  freeform_tags              = local.tags
}

# Subnet privada: siempre si enabled (VM en modo bastion). En restricted_public queda vacía de compute.
resource "oci_core_subnet" "private" {
  count          = local.enabled ? 1 : 0
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.exp4[0].id
  cidr_block     = var.private_subnet_cidr
  display_name   = local.name_subnet_private
  route_table_id = one(coalescelist(
    oci_core_route_table.private[*].id,
    oci_core_route_table.public[*].id
  ))
  # EXPLÍCITO: SL Exp4 propia — no Default Security List
  security_list_ids          = oci_core_security_list.private[*].id
  prohibit_public_ip_on_vnic = true
  dns_label                  = "exp4priv"
  freeform_tags              = local.tags
}
