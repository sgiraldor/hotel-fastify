# AD por índice en el compartment indicado — no selecciona instancias/VCN Hotel por nombre.
data "oci_identity_availability_domains" "ads" {
  count          = local.enabled ? 1 : 0
  compartment_id = var.compartment_ocid
}

locals {
  ad_name = local.enabled ? data.oci_identity_availability_domains.ads[0].availability_domains[var.availability_domain_index].name : null
}
