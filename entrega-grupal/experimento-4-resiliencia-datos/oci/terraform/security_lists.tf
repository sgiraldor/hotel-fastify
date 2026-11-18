# Security Lists EXCLUSIVAS Exp4.
# Se asocian explícitamente a las subnets (security_list_ids) para NO heredar
# la Default Security List (que suele permitir SSH 0.0.0.0/0).
# OCI SL no tiene reglas DENY: lo no permitido queda denegado implícitamente.
#
# Efecto con NSG: en OCI el tráfico se permite si coincide con una regla de
# CUALQUIERA de las security lists O de los NSG asociados. Por eso una Default
# SL permisiva anularía un NSG restrictivo — aquí la SL propia es restrictiva.

locals {
  name_sl_private = "${var.display_name_prefix}-sl-private"
  name_sl_public  = "${var.display_name_prefix}-sl-public"
}

# --- Subnet privada (VM en modo bastion): SSH solo desde CIDR VCN Exp4 ---
resource "oci_core_security_list" "private" {
  count          = local.enabled ? 1 : 0
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.exp4[0].id
  display_name   = local.name_sl_private
  freeform_tags  = local.tags

  # Path MTU Discovery
  ingress_security_rules {
    protocol    = "1" # ICMP
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = false
    description = "ICMP type 3 code 4 (PMTUD)"

    icmp_options {
      type = 3
      code = 4
    }
  }

  # SSH desde Bastion / hosts dentro de la VCN Exp4 (nunca 0.0.0.0/0)
  ingress_security_rules {
    protocol    = "6"
    source      = var.vcn_cidr
    source_type = "CIDR_BLOCK"
    stateless   = false
    description = "SSH TCP/22 solo desde VCN Exp4 (camino Bastion)"

    tcp_options {
      min = 22
      max = 22
    }
  }

  # Egreso justificado (Docker Hub, yum, DNS) — no "all protocols"
  # El endpoint Bastion 10.31.1.75 vive en esta subred y necesita poder iniciar TCP/22.
  egress_security_rules {
    protocol         = "6"
    destination      = "10.31.1.229/32"
    destination_type = "CIDR_BLOCK"
    stateless        = false
    description      = "SSH Bastion Exp4 hacia VM Exp4"

    tcp_options {
      min = 22
      max = 22
    }
  }

  egress_security_rules {
    protocol         = "6"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    stateless        = false
    description      = "Egreso TCP/443"

    tcp_options {
      min = 443
      max = 443
    }
  }

  egress_security_rules {
    protocol         = "6"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    stateless        = false
    description      = "Egreso TCP/80"

    tcp_options {
      min = 80
      max = 80
    }
  }

  egress_security_rules {
    protocol         = "17"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    stateless        = false
    description      = "Egreso UDP/53 DNS"

    udp_options {
      min = 53
      max = 53
    }
  }

  egress_security_rules {
    protocol         = "6"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    stateless        = false
    description      = "Egreso TCP/53 DNS"

    tcp_options {
      min = 53
      max = 53
    }
  }

  egress_security_rules {
    protocol         = "1"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    stateless        = false
    description      = "ICMP egreso (PMTUD/diagnóstico mínimo)"

    icmp_options {
      type = 3
      code = 4
    }
  }
}

# --- Subnet pública ---
# Modo bastion: sin SSH público (Bastion es servicio gestionado; VM no vive aquí).
# Modo restricted_public: SSH solo desde ssh_authorized_cidr (validado ≠ 0.0.0.0/0).
resource "oci_core_security_list" "public" {
  count          = local.enabled ? 1 : 0
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.exp4[0].id
  display_name   = local.name_sl_public
  freeform_tags  = local.tags

  ingress_security_rules {
    protocol    = "1"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = false
    description = "ICMP type 3 code 4 (PMTUD)"

    icmp_options {
      type = 3
      code = 4
    }
  }

  dynamic "ingress_security_rules" {
    for_each = local.use_restricted_public ? [1] : []
    content {
      protocol    = "6"
      source      = var.ssh_authorized_cidr
      source_type = "CIDR_BLOCK"
      stateless   = false
      description = "SSH TCP/22 solo desde ssh_authorized_cidr (restricted_public)"

      tcp_options {
        min = 22
        max = 22
      }
    }
  }

  egress_security_rules {
    protocol         = "6"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    stateless        = false
    description      = "Egreso TCP/443"

    tcp_options {
      min = 443
      max = 443
    }
  }

  egress_security_rules {
    protocol         = "6"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    stateless        = false
    description      = "Egreso TCP/80"

    tcp_options {
      min = 80
      max = 80
    }
  }

  egress_security_rules {
    protocol         = "17"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    stateless        = false
    description      = "Egreso UDP/53"

    udp_options {
      min = 53
      max = 53
    }
  }

  egress_security_rules {
    protocol         = "6"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    stateless        = false
    description      = "Egreso TCP/53"

    tcp_options {
      min = 53
      max = 53
    }
  }
}
