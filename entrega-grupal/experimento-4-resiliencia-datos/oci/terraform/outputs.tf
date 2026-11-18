output "enable_exp4_oci" {
  value = var.enable_exp4_oci
}

output "resources_would_be_created" {
  description = "false cuando enable_exp4_oci=false (ningún recurso con count>0)."
  value       = local.enabled
}

output "access_mode" {
  value = var.access_mode
}

output "inventory_ocids" {
  description = "Inventario de OCIDs Exp4 para cleanup por identidad (no por nombre parcial)."
  value = local.enabled ? {
    vcn_ocid              = try(oci_core_vcn.exp4[0].id, null)
    public_subnet_ocid    = try(oci_core_subnet.public[0].id, null)
    private_subnet_ocid   = try(oci_core_subnet.private[0].id, null)
    security_list_private = try(oci_core_security_list.private[0].id, null)
    security_list_public  = try(oci_core_security_list.public[0].id, null)
    igw_ocid              = try(oci_core_internet_gateway.exp4[0].id, null)
    nat_ocid              = try(oci_core_nat_gateway.exp4[0].id, null)
    nsg_vm_ocid           = try(oci_core_network_security_group.vm[0].id, null)
    instance_ocid         = try(oci_core_instance.exp4[0].id, null)
    bastion_ocid          = try(oci_bastion_bastion.exp4[0].id, null)
    boot_volume_ocid      = try(oci_core_instance.exp4[0].boot_volume_id, null)
  } : {}
}

output "security_list_posture" {
  value = {
    default_sl_inherited     = false
    ssh_from_internet        = false
    mysql_3306_public        = false
    egress_all_protocols     = false
    egress_ports_documented  = ["80", "443", "53"]
    nsg_and_sl_both_restrict = true
  }
}

output "instance_shape" {
  value = local.enabled ? {
    shape         = var.shape
    ocpus         = var.ocpus
    memory_in_gbs = var.memory_in_gbs
    image_ocid    = var.image_ocid
  } : null
}

output "network_summary" {
  value = local.enabled ? {
    vcn_cidr             = var.vcn_cidr
    private_subnet_cidr  = var.private_subnet_cidr
    public_subnet_cidr   = var.public_subnet_cidr
    hotel_vcn_cidr_known = local.hotel_vcn_cidr_known
    peering_to_hotel     = false
    mysql_public_3306    = false
    ssh_from_world       = false
  } : null
}

output "cost_controls_disclaimer" {
  value = {
    budget_note_usd_documentary       = var.budget_note_usd
    budget_sufficiency_certified      = false
    oci_min_availability_hours        = var.oci_min_availability_hours
    oci_planned_availability_hours    = var.oci_planned_availability_hours
    experiment_ttl_independent_of_oci = true
    terraform_enforces_budget         = false
    lab_watchdog_terminates_oci       = false
    oci_auto_destroy_after_hours      = false
    bastion_service_price             = "Free (Oracle Bastion pricing)"
    nat_gateway_price                 = "No hourly SKU in price-list HTML; secondary Oracle sources indicate free (egress may apply)"
    a1_list_price_hint                = "USD 0.01/OCPU-h + USD 0.0015/GB-h if Ampere free exhausted"
    boot_volume_gb_month_price        = "Unit price cell empty in static HTML; Always Free block allowance typically 200GB in home region"
  }
}

output "tags" {
  value = local.tags
}
