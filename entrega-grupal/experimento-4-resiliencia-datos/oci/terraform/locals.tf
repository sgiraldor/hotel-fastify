locals {
  tags = {
    experimento = "seguridad-caos-exp4"
    purpose     = "synthetic-rpo-rto-lab"
    managed_by  = "exp4-terraform"
    owner       = "grupo-exp4"
  }

  # Gate único: ningún recurso con count/for_each fuera de este flag.
  enabled = var.enable_exp4_oci && var.compartment_ocid != ""

  use_bastion           = local.enabled && var.access_mode == "bastion"
  use_restricted_public = local.enabled && var.access_mode == "restricted_public"

  # Validaciones duras solo cuando se intenta habilitar (para no romper validate con defaults).
  enable_preflight_ok = !var.enable_exp4_oci || (
    var.compartment_ocid != "" &&
    var.image_ocid != "" &&
    var.ssh_public_key != "" &&
    var.ssh_authorized_cidr != "0.0.0.0/0"
  )

  name_vcn            = "${var.display_name_prefix}-vcn"
  name_subnet_private = "${var.display_name_prefix}-subnet-private"
  name_subnet_public  = "${var.display_name_prefix}-subnet-public"
  name_igw            = "${var.display_name_prefix}-igw"
  name_nat            = "${var.display_name_prefix}-nat"
  name_rt_private     = "${var.display_name_prefix}-rt-private"
  name_rt_public      = "${var.display_name_prefix}-rt-public"
  name_nsg_vm         = "${var.display_name_prefix}-nsg-vm"
  name_nsg_bastion    = "${var.display_name_prefix}-nsg-bastion"
  name_vm             = "${var.display_name_prefix}-vm"
  name_bastion        = "${var.display_name_prefix}-bastion"

  # Hotel CIDR conocido (solo documentación / guardrail; no se referencia por OCID).
  hotel_vcn_cidr_known = "10.20.0.0/16"
}

# Falla el plan/apply de forma explícita si enable=true sin prerequisitos.
resource "terraform_data" "enable_guard" {
  count = var.enable_exp4_oci ? 1 : 0

  lifecycle {
    precondition {
      condition     = local.enable_preflight_ok
      error_message = "enable_exp4_oci=true requiere compartment_ocid, image_ocid (sa-bogota-1), ssh_public_key y ssh_authorized_cidr != 0.0.0.0/0."
    }
    precondition {
      condition     = var.vcn_cidr != local.hotel_vcn_cidr_known
      error_message = "vcn_cidr no puede ser el CIDR de hotel-vcn (10.20.0.0/16)."
    }
  }
}
