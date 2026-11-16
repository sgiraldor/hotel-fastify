variable "tenancy_ocid" {
  type        = string
  description = "OCID del tenancy OCI"
}

variable "user_ocid" {
  type        = string
  description = "OCID del usuario que ejecuta Terraform"
}

variable "fingerprint" {
  type        = string
  description = "Fingerprint de la API key"
}

variable "private_key_path" {
  type        = string
  description = "Ruta local a la clave privada OCI (NUNCA versionar la clave)"
}

variable "region" {
  type        = string
  description = "Region OCI (ej. us-ashburn-1, sa-bogota-1)"
  default     = "sa-bogota-1"
}

variable "compartment_ocid" {
  type        = string
  description = "Compartment donde vivira el laboratorio Hotel"
}

variable "project_name" {
  type        = string
  default     = "hotel"
}

variable "vcn_cidr" {
  type        = string
  default     = "10.20.0.0/16"
}

variable "create_oke" {
  type        = bool
  description = "Si false, solo documenta/variables; no crea cluster (evita costo accidental)"
  default     = false
}

variable "node_pool_size" {
  type        = number
  description = "Nodos del pool academico (mantener bajo)"
  default     = 2
}

variable "node_shape" {
  type        = string
  default     = "VM.Standard.E4.Flex"
}

variable "node_ocpus" {
  type        = number
  default     = 1
}

variable "node_memory_gb" {
  type        = number
  default     = 8
}
