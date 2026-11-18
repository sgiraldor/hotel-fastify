variable "enable_exp4_oci" {
  description = "Debe permanecer false hasta autorización explícita. Con false, count=0 en TODOS los recursos."
  type        = bool
  default     = false
}

variable "region" {
  description = "Región OCI del laboratorio Exp4."
  type        = string
  default     = "sa-bogota-1"

  validation {
    condition     = var.region == "sa-bogota-1"
    error_message = "Exp4 está acotado a sa-bogota-1 en esta entrega."
  }
}

variable "compartment_ocid" {
  description = "Compartment destino. Obligatorio solo si enable_exp4_oci=true."
  type        = string
  default     = ""
}

variable "access_mode" {
  description = <<-EOT
    bastion: subred privada + Bastion (gratis) + NAT para egreso Docker (sin SKU horario; egreso de datos puede aplicar).
    restricted_public: subred pública dedicada + SSH solo desde ssh_authorized_cidr (sin 0.0.0.0/0) + IGW egreso.
  EOT
  type        = string
  default     = "bastion"

  validation {
    condition     = contains(["bastion", "restricted_public"], var.access_mode)
    error_message = "access_mode debe ser bastion o restricted_public."
  }
}

variable "ssh_authorized_cidr" {
  description = "CIDR IPv4/IPv6 exacto del operador para Bastion client allowlist o SSH. Nunca 0.0.0.0/0 ni ::/0. No usar CIDR de ejemplo en despliegue real."
  type        = string
  default     = "127.0.0.1/32"

  validation {
    condition = (
      var.ssh_authorized_cidr != "0.0.0.0/0"
      && var.ssh_authorized_cidr != "::/0"
      && (
        can(cidrnetmask(var.ssh_authorized_cidr))
        || can(cidrhost(var.ssh_authorized_cidr, 0))
      )
    )
    error_message = "ssh_authorized_cidr debe ser un CIDR IPv4/IPv6 válido y no puede ser 0.0.0.0/0 ni ::/0."
  }
}

variable "ssh_public_key" {
  description = "Clave pública SSH del operador. Nunca colocar la privada en Terraform."
  type        = string
  default     = ""
  sensitive   = true
}

variable "shape" {
  description = "Shape Compute. Candidato A1; E4 solo si A1 sin capacidad (selección manual, no automática)."
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "ocpus" {
  type    = number
  default = 1

  validation {
    condition     = var.ocpus >= 1 && var.ocpus <= 2
    error_message = "ocpus Exp4 acotado a 1..2 para presupuesto de lab."
  }
}

variable "memory_in_gbs" {
  type    = number
  default = 6

  validation {
    condition     = var.memory_in_gbs >= 6 && var.memory_in_gbs <= 12
    error_message = "memory_in_gbs Exp4 acotado a 6..12."
  }
}

variable "boot_volume_size_in_gbs" {
  description = "Boot volume propio. No reutilizar volúmenes Hotel."
  type        = number
  default     = 50

  validation {
    condition     = var.boot_volume_size_in_gbs >= 50 && var.boot_volume_size_in_gbs <= 100
    error_message = "boot_volume_size_in_gbs debe estar entre 50 y 100."
  }
}

variable "image_ocid" {
  description = <<-EOT
    OCID de imagen en sa-bogota-1. NO inventar.
    Verificado (lectura OCI 2026-11-18) para A1/aarch64:
    Oracle-Linux-9.8-aarch64-2026.10.30-0 =
    ocid1.image.oc1.sa-bogota-1.aaaaaaaalv7qc7lpqwo7aahpcg2bq7eqllb6yfbj32m37o6tjgqs4ssuzl2a
    Para E4/amd64 usar la imagen Oracle Linux x86 listada en evidencias/oci-readonly-fase9.
    Obligatorio si enable_exp4_oci=true.
  EOT
  type        = string
  default     = ""

  validation {
    condition     = var.image_ocid == "" || startswith(var.image_ocid, "ocid1.image.oc1.sa-bogota-1.")
    error_message = "image_ocid debe estar vacío (disabled) o ser ocid1.image.oc1.sa-bogota-1.*"
  }
}

variable "vcn_cidr" {
  type    = string
  default = "10.31.0.0/16"

  validation {
    condition     = var.vcn_cidr == "10.31.0.0/16"
    error_message = "vcn_cidr fijado a 10.31.0.0/16 (no colisiona con hotel-vcn 10.20.0.0/16)."
  }
}

variable "private_subnet_cidr" {
  type    = string
  default = "10.31.1.0/24"
}

variable "public_subnet_cidr" {
  description = "Subnet pública: Bastion (modo bastion) o VM (modo restricted_public)."
  type        = string
  default     = "10.31.2.0/24"
}

variable "availability_domain_index" {
  description = "Índice 0-based sobre data.oci_identity_availability_domains (no selecciona recursos Hotel por nombre)."
  type        = number
  default     = 0
}

variable "display_name_prefix" {
  type    = string
  default = "seguridad-caos-exp4"
}

variable "budget_note_usd" {
  description = <<-EOT
    Nota documental opcional de presupuesto. Terraform NO la aplica como circuit-breaker.
    Valor 0 = no certificado. NO declarar suficiencia (p.ej. USD 5) sin recalcular el día D
    para la ventana OCI ≥9h (ver docs/13-costos-oci-exp4.md).
  EOT
  type        = number
  default     = 0
}

variable "oci_min_availability_hours" {
  description = <<-EOT
    Vida mínima documental de la infraestructura OCI Exp4 (≥9h) para R0/R1, evidencias y sustentación.
    Independiente del TTL del experimento (STOP/watchdog / MaxMinutes).
    Terraform NO apaga ni destruye la VM al cumplirse este valor.
  EOT
  type        = number
  default     = 9

  validation {
    condition     = var.oci_min_availability_hours >= 9
    error_message = "oci_min_availability_hours debe ser ≥ 9 (ventana mínima de sustentación)."
  }
}

variable "oci_planned_availability_hours" {
  description = <<-EOT
    Horizonte de planificación de costos (buffer recomendado, p.ej. 12h).
    NO programa terraform destroy ni auto-terminate. Cleanup solo con autorización post-sustentación.
  EOT
  type        = number
  default     = 12

  validation {
    condition     = var.oci_planned_availability_hours >= var.oci_min_availability_hours
    error_message = "oci_planned_availability_hours debe ser ≥ oci_min_availability_hours."
  }
}
