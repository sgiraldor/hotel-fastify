locals {
  architecture_note = startswith(var.shape, "VM.Standard.A1") ? "aarch64/arm64 — rebuild imágenes lab en la VM" : "amd64/x86_64 — alinear con builds locales"
  # splat/coalescelist evita referencias [0] inválidas cuando count=0
  subnet_id_for_vm = try(
    coalescelist(
      local.use_bastion ? oci_core_subnet.private[*].id : [],
      oci_core_subnet.public[*].id
    )[0],
    null
  )
  assign_public_ip = local.use_restricted_public
}

resource "oci_core_instance" "exp4" {
  count               = local.enabled ? 1 : 0
  compartment_id      = var.compartment_ocid
  availability_domain = local.ad_name
  display_name        = local.name_vm
  shape               = var.shape
  freeform_tags       = local.tags

  shape_config {
    ocpus         = var.ocpus
    memory_in_gbs = var.memory_in_gbs
  }

  create_vnic_details {
    subnet_id        = local.subnet_id_for_vm
    assign_public_ip = local.assign_public_ip
    display_name     = "${local.name_vm}-vnic"
    hostname_label   = "exp4vm"
    nsg_ids          = oci_core_network_security_group.vm[*].id
  }

  source_details {
    source_type             = "image"
    source_id               = var.image_ocid
    boot_volume_size_in_gbs = var.boot_volume_size_in_gbs
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data = base64encode(templatefile("${path.module}/cloud-init.yaml.tftpl", {
      architecture_note = local.architecture_note
      access_mode       = var.access_mode
    }))
  }

  agent_config {
    are_all_plugins_disabled = false
    is_management_disabled   = false
    is_monitoring_disabled   = false
    plugins_config {
      desired_state = "ENABLED"
      name          = "Bastion"
    }
  }

  # Ignorar estas claves no escribe authorized_keys ni reinstala cloud-init.
  # ssh_authorized_keys queda fuera del plan: un CRLF del tfvars local
  # no debe forzar el reemplazo de la VM.
  lifecycle {
    ignore_changes = [
      metadata["user_data"],
      metadata["ssh_authorized_keys"],
    ]
  }
}
