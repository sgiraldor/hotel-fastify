# OKE Basic + 1 worker A1.Flex (autorizado). create_oke controla el provisionamiento.

resource "oci_containerengine_cluster" "hotel" {
  count              = var.create_oke ? 1 : 0
  compartment_id     = var.compartment_ocid
  name               = "${var.project_name}-oke"
  vcn_id             = oci_core_vcn.hotel[0].id
  kubernetes_version       = var.kubernetes_version
  type               = var.oke_cluster_type == "ENHANCED" ? "ENHANCED_CLUSTER" : "BASIC_CLUSTER"

  endpoint_config {
    is_public_ip_enabled = true
    subnet_id            = oci_core_subnet.public[0].id
  }

  options {
    service_lb_subnet_ids = [oci_core_subnet.public[0].id]

    kubernetes_network_config {
      pods_cidr     = "10.244.0.0/16"
      services_cidr = "10.96.0.0/16"
    }
  }
}

resource "oci_containerengine_node_pool" "hotel" {
  count          = var.create_oke ? 1 : 0
  cluster_id     = oci_containerengine_cluster.hotel[0].id
  compartment_id = var.compartment_ocid
  name           = "${var.project_name}-np-a1"
  node_shape     = var.node_shape
  kubernetes_version   = var.kubernetes_version

  node_shape_config {
    ocpus         = var.node_ocpus
    memory_in_gbs = var.node_memory_gb
  }

  node_config_details {
    size = var.node_pool_size

    placement_configs {
      availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
      subnet_id           = oci_core_subnet.workers[0].id
    }
  }

  node_source_details {
    image_id                = var.node_image_id
    source_type             = "IMAGE"
    boot_volume_size_in_gbs = var.node_boot_volume_gb
  }

  initial_node_labels {
    key   = "lab"
    value = "hotel-seguimiento-4"
  }
}
