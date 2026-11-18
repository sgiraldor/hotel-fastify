resource "oci_core_network_security_group" "vm" {
  count          = local.enabled ? 1 : 0
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.exp4[0].id
  display_name   = local.name_nsg_vm
  freeform_tags  = local.tags
}

# SSH desde Bastion (VCN CIDR) en modo privado — no 0.0.0.0/0.
resource "oci_core_network_security_group_security_rule" "vm_ssh_from_vcn" {
  count                     = local.use_bastion ? 1 : 0
  network_security_group_id = oci_core_network_security_group.vm[0].id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  source                    = var.vcn_cidr
  source_type               = "CIDR_BLOCK"
  stateless                 = false
  description               = "SSH desde Bastion/VCN Exp4 únicamente"

  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}

# SSH directo solo desde CIDR operador en modo restricted_public.
resource "oci_core_network_security_group_security_rule" "vm_ssh_from_operator" {
  count                     = local.use_restricted_public ? 1 : 0
  network_security_group_id = oci_core_network_security_group.vm[0].id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = var.ssh_authorized_cidr
  source_type               = "CIDR_BLOCK"
  stateless                 = false
  description               = "SSH temporal restringido al CIDR del operador"

  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}

# Egreso: HTTPS/HTTP para Docker Hub, yum, git. DNS.
# No se abre 3306 en ingreso. MySQL permanece en red Docker internal del lab.
resource "oci_core_network_security_group_security_rule" "vm_egress_https" {
  count                     = local.enabled ? 1 : 0
  network_security_group_id = oci_core_network_security_group.vm[0].id
  direction                 = "EGRESS"
  protocol                  = "6"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  stateless                 = false
  description               = "Egreso TCP 443 (imágenes/paquetes)"

  tcp_options {
    destination_port_range {
      min = 443
      max = 443
    }
  }
}

resource "oci_core_network_security_group_security_rule" "vm_egress_http" {
  count                     = local.enabled ? 1 : 0
  network_security_group_id = oci_core_network_security_group.vm[0].id
  direction                 = "EGRESS"
  protocol                  = "6"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  stateless                 = false
  description               = "Egreso TCP 80 (repos yum/apt redirects)"

  tcp_options {
    destination_port_range {
      min = 80
      max = 80
    }
  }
}

resource "oci_core_network_security_group_security_rule" "vm_egress_dns_udp" {
  count                     = local.enabled ? 1 : 0
  network_security_group_id = oci_core_network_security_group.vm[0].id
  direction                 = "EGRESS"
  protocol                  = "17" # UDP
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  stateless                 = false
  description               = "DNS UDP 53"

  udp_options {
    destination_port_range {
      min = 53
      max = 53
    }
  }
}

resource "oci_core_network_security_group_security_rule" "vm_egress_dns_tcp" {
  count                     = local.enabled ? 1 : 0
  network_security_group_id = oci_core_network_security_group.vm[0].id
  direction                 = "EGRESS"
  protocol                  = "6"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  stateless                 = false
  description               = "DNS TCP 53"

  tcp_options {
    destination_port_range {
      min = 53
      max = 53
    }
  }
}

# Explicit deny posture note: no ingress 3306 rule exists on purpose.
