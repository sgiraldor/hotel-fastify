# Repositorio OCIR para la imagen Hotel (storage bajo hasta que se suban capas).

resource "oci_artifacts_container_repository" "hotel_api" {
  count          = var.create_oke ? 1 : 0
  compartment_id = var.compartment_ocid
  display_name   = "hotel-api"
  is_immutable   = false
  is_public      = true
}
