variable "aws_region" {
  description = "Region de AWS donde se desplegara la infraestructura"
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
  default     = "hotel"
}

variable "environment" {
  description = "Ambiente de despliegue"
  type        = string
  default     = "production"
}

variable "ec2_instance_type" {
  description = "Tipo de instancia EC2 para la API"
  type        = string
  default     = "t3.micro"
}

variable "db_name" {
  description = "Nombre de la base de datos MySQL"
  type        = string
  default     = "hotel_db"
}

variable "db_username" {
  description = "Usuario de la base de datos"
  type        = string
  default     = "hoteladmin"
}
