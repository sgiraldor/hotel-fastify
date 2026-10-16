# Infraestructura AWS - Hotel V3

## Descripción

Esta carpeta contiene la infraestructura del proyecto Hotel V3 definida mediante Terraform y desplegada en Amazon Web Services (AWS).

La infraestructura está organizada mediante archivos `.tf` separados por responsabilidad, permitiendo administrar los recursos de forma modular.

## Arquitectura

La infraestructura utiliza los siguientes servicios de AWS:

- Amazon VPC
- Amazon EC2
- Amazon RDS MySQL
- Amazon ElastiCache Redis
- Amazon S3
- Amazon SQS
- AWS IAM
- AWS Secrets Manager
- Security Groups
- Subredes públicas y privadas

### Distribución de la infraestructura

La VPC utiliza el rango:

`10.0.0.0/16`

Cuenta con:

- Subred pública A: `10.0.1.0/24`
- Subred pública B: `10.0.2.0/24`
- Subred privada A: `10.0.11.0/24`
- Subred privada B: `10.0.12.0/24`

La instancia EC2 se encuentra en una subred pública y ejecuta la API Hotel mediante Docker.

La base de datos MySQL de Amazon RDS y Redis de ElastiCache se encuentran en subredes privadas.

## Estructura de Terraform

- `provider.tf`: configuración del proveedor AWS.
- `versions.tf`: versiones requeridas de Terraform y del proveedor AWS.
- `variables.tf`: variables principales del proyecto.
- `network.tf`: VPC, subredes, Internet Gateway y tabla de rutas.
- `security.tf`: Security Groups de EC2, RDS y Redis.
- `ec2.tf`: instancia EC2 e instalación de Docker.
- `rds.tf`: RDS MySQL y grupo de subredes.
- `redis.tf`: ElastiCache Redis y grupo de subredes.
- `s3.tf`: bucket S3, versionamiento, cifrado y bloqueo de acceso público.
- `sqs.tf`: cola SQS y configuración de cifrado.
- `iam.tf`: roles, políticas e Instance Profile utilizados por EC2.

## Requisitos previos

Antes de ejecutar Terraform se requiere:

- Terraform instalado.
- AWS CLI instalado.
- Una sesión de AWS activa.
- Acceso a la cuenta de AWS correspondiente.
- Permisos suficientes para crear y administrar los recursos definidos en Terraform.

Para verificar la autenticación:

```powershell
aws sts get-caller-identity