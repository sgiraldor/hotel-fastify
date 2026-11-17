# Esqueleto academico OKE. Desactivado por defecto (create_oke=false).
# Preferir un cluster OKE ya existente del laboratorio si esta disponible.
# NO ejecutar terraform apply sin autorizacion explicita (genera costo).

resource "oci_containerengine_cluster" "hotel" {
  count              = var.create_oke ? 1 : 0
  compartment_id     = var.compartment_ocid
  name               = "${var.project_name}-oke"
  vcn_id             = oci_core_vcn.hotel[0].id
  kubernetes_version       = "v1.31.1"
  # BASIC evita el cargo de control plane (US$0.10/h de Enhanced).
  type               = var.oke_cluster_type == "ENHANCED" ? "ENHANCED_CLUSTER" : "BASIC_CLUSTER"

  options {
    service_lb_subnet_ids = [oci_core_subnet.public[0].id]

    kubernetes_network_config {
      pods_cidr     = "10.244.0.0/16"
      services_cidr = "10.96.0.0/16"
    }
  }
}

# Node pool se deja como documentacion parametrizada.
# Completar subnet/node shape IDs tras revisar disponibilidad en la region.
#
# resource "oci_containerengine_node_pool" "hotel" {
#   count ...
# }
