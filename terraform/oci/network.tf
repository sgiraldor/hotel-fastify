# Red minima academica: 1 VCN + IGW + 1 subnet publica (sin NAT Gateway).
# create_oke=false => no provisiona.

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

resource "oci_core_route_table" "public" {
  count          = var.create_oke ? 1 : 0
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.hotel[0].id
  display_name   = "${var.project_name}-public-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.hotel[0].id
  }
}

resource "oci_core_security_list" "hotel" {
  count          = var.create_oke ? 1 : 0
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.hotel[0].id
  display_name   = "${var.project_name}-sl"

  egress_security_rules {
    protocol         = "all"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
  }

  # Kubernetes API
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"

    tcp_options {
      min = 6443
      max = 6443
    }
  }

  # SSH lab (opcional)
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"

    tcp_options {
      min = 22
      max = 22
    }
  }

  # NodePort / health checks
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"

    tcp_options {
      min = 30000
      max = 32767
    }
  }

  # HTTP/HTTPS (NLB -> nodes)
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"

    tcp_options {
      min = 80
      max = 80
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"

    tcp_options {
      min = 443
      max = 443
    }
  }

  # Worker <-> worker / pods (VCN)
  ingress_security_rules {
    protocol = "all"
    source   = var.vcn_cidr
  }

  # Path discovery
  ingress_security_rules {
    protocol = "1"
    source   = "0.0.0.0/0"

    icmp_options {
      type = 3
      code = 4
    }
  }
}

# Subnet para API endpoint + NLB/Service LB (no usable por node pools).
# dns_label/display_name se conservan para no forzar recreación del clúster ya ACTIVE.
resource "oci_core_subnet" "public" {
  count                      = var.create_oke ? 1 : 0
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.hotel[0].id
  cidr_block                 = cidrsubnet(var.vcn_cidr, 8, 1)
  display_name               = "${var.project_name}-public"
  prohibit_public_ip_on_vnic = false
  dns_label                  = "public"
  route_table_id             = oci_core_route_table.public[0].id
  security_list_ids          = [oci_core_security_list.hotel[0].id]
}

# Subnet dedicada a workers (requerido por OKE; publica para evitar NAT).
resource "oci_core_subnet" "workers" {
  count                      = var.create_oke ? 1 : 0
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.hotel[0].id
  cidr_block                 = cidrsubnet(var.vcn_cidr, 8, 2)
  display_name               = "${var.project_name}-workers"
  prohibit_public_ip_on_vnic = false
  dns_label                  = "workers"
  route_table_id             = oci_core_route_table.public[0].id
  security_list_ids          = [oci_core_security_list.hotel[0].id]
}
