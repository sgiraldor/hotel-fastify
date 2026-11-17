output "cluster_id" {
  value       = try(oci_containerengine_cluster.hotel[0].id, null)
  description = "OCID del cluster OKE (sensible: no publicar en chats publicos)"
  sensitive   = true
}

output "node_pool_id" {
  value     = try(oci_containerengine_node_pool.hotel[0].id, null)
  sensitive = true
}

output "vcn_id" {
  value     = try(oci_core_vcn.hotel[0].id, null)
  sensitive = true
}

output "subnet_id" {
  value     = try(oci_core_subnet.public[0].id, null)
  sensitive = true
}

data "oci_objectstorage_namespace" "ns" {
  compartment_id = var.tenancy_ocid
}

output "ocir_repository" {
  value = "bog.ocir.io/${data.oci_objectstorage_namespace.ns.namespace}/hotel-api"
}

output "ocir_namespace" {
  value = data.oci_objectstorage_namespace.ns.namespace
}

output "kubernetes_version" {
  value = var.kubernetes_version
}

output "node_shape_summary" {
  value = "${var.node_shape} ${var.node_ocpus} OCPU / ${var.node_memory_gb} GB x${var.node_pool_size}"
}

output "cluster_type" {
  value = var.oke_cluster_type
}
