# Red minima academica. create_oke=false por defecto: no provisiona recursos.
# Revisar recursos existentes en la consola OCI antes de apply.

resource "oci_core_vcn" "hotel" {
  count          = var.create_oke ? 1 : 0
  compartment_id = var.compartment_ocid
  cidr_blocks    = [var.vcn_cidr]
  display_name   = "${var.project_name}-vcn"
  dns_label      = "hotel"
}

resource "oci_core_internet_gateway" "hotel" {
  count          = var.create_oke ? 1 : 0
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.hotel[0].id
  display_name   = "${var.project_name}-igw"
  enabled        = true
}

resource "oci_core_subnet" "public" {
  count                      = var.create_oke ? 1 : 0
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.hotel[0].id
  cidr_block                 = cidrsubnet(var.vcn_cidr, 8, 1)
  display_name               = "${var.project_name}-public"
  prohibit_public_ip_on_vnic = false
  dns_label                  = "public"
}
