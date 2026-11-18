terraform {
  required_version = ">= 1.5.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 5.0.0, < 7.0.0"
    }
  }

  # State 100% local a este directorio Exp4. NO remote state Hotel.
  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "oci" {
  # Usa ~/.oci/config (perfil DEFAULT) o variables de entorno OCI_*.
  # No se definen tenancy/user aquí para no incrustar secretos.
  region = var.region
}
