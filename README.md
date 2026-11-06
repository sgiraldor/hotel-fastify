# Proyecto Hotel

Este proyecto consiste en una API REST para manejar información básica de un hotel.

La aplicación permite registrar huéspedes, habitaciones y check-ins. También permite consultar, actualizar y eliminar la información guardada.

El proyecto fue realizado usando Fastify, TypeScript y MySQL. Durante el desarrollo también se incorporaron pruebas automatizadas, Docker, GitHub Actions y una estrategia de despliegue Canary sobre Google Cloud Run.

## Tecnologías usadas

- Node.js
- TypeScript
- Fastify
- MySQL
- TypeORM
- Vitest
- Docker
- Docker Compose
- GitHub Actions
- Google Cloud Run
- Google Artifact Registry
- Google Cloud Monitoring
- Git y GitHub

## Entidades del proyecto

El proyecto tiene 3 entidades principales:

### Huesped

Guarda la información de las personas que llegan al hotel.

### Habitacion

Guarda la información de las habitaciones disponibles en el hotel.

### CheckIn

Permite relacionar un huésped con una habitación y guardar la información de su estadía.

## Requisitos para ejecutar el proyecto

Antes de ejecutar el proyecto se debe tener instalado:

- Node.js
- npm
- Git

Si se quiere ejecutar usando contenedores también se debe tener:

- Docker Desktop
- Docker Compose

## Clonar el proyecto

```bash
git clone https://github.com/sgiraldor/hotel-fastify.git
cd hotel-fastify
```

## Instalar las dependencias

```bash
npm install
```

## Variables de entorno

Para trabajar de forma local se debe crear un archivo llamado:

```text
.env
```

Ejemplo:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=contraseña
DB_NAME=hotel
```

Los valores pueden cambiar dependiendo de la configuración de MySQL que tenga cada persona.

## Ejecutar el proyecto

Para iniciar el proyecto en modo desarrollo:

```bash
npm run dev
```

La aplicación se ejecuta normalmente en:

```text
http://localhost:3000
```

Para verificar que la API está funcionando se puede hacer una petición GET a `/`.

## Rutas de Huesped

```text
POST   /huesped
GET    /huesped
GET    /huesped/:id
PATCH  /huesped/:id
DELETE /huesped/:id
```

## Rutas de Habitacion

```text
POST   /habitacion
GET    /habitacion
GET    /habitacion/:id
PATCH  /habitacion/:id
DELETE /habitacion/:id
```

## Rutas de CheckIn

```text
POST   /checkin
GET    /checkin
GET    /checkin/:id
PATCH  /checkin/:id
DELETE /checkin/:id
```

## Pruebas

El proyecto tiene pruebas unitarias y pruebas de integración realizadas con Vitest.

Para ejecutar las pruebas:

```bash
npm test
```

Para ejecutar las pruebas y mirar la cobertura:

```bash
npm run test:coverage
```

## Docker

Para construir y levantar los contenedores:

```bash
docker compose up --build
```

Para consultar los contenedores:

```bash
docker compose ps
```

Para detenerlos:

```bash
docker compose down
```

La API queda disponible en:

```text
http://localhost:3000
```

## Base de datos

El proyecto utiliza MySQL como base de datos.

Las tablas principales son:

```text
huesped
habitacion
checkin
```

## GitHub Actions

El proyecto utiliza GitHub Actions para automatizar procesos de integración, pruebas y despliegue.

Actualmente el repositorio contiene un pipeline específico para la estrategia Canary:

```text
.github/workflows/canary-pipeline.yml
```

El pipeline realiza, entre otros, los siguientes pasos:

1. Descarga del código.
2. Configuración de Node.js.
3. Instalación de dependencias.
4. Compilación.
5. Ejecución de pruebas.
6. Autenticación en Google Cloud.
7. Construcción de la imagen Docker.
8. Publicación en Artifact Registry.
9. Obtención del digest inmutable.
10. Despliegue de la nueva revisión Canary.
11. Smoke test.
12. Distribución progresiva del tráfico.
13. Validación de cada etapa.
14. Promoción final al 100%.

Los commits del proyecto utilizan GitMoji.

## Despliegue Canary

La estrategia Canary se implementó sobre Google Cloud Run.

En este proyecto se utilizan las siguientes revisiones:

| Revisión | Rol |
|---|---|
| V1 | Stable |
| V4 | Canary |

V1 corresponde a la versión estable y V4 corresponde a la nueva versión que se prueba progresivamente antes de recibir todo el tráfico.

### Cambio funcional de V4

La versión V4 incorpora cambios funcionales respecto a V1.

Entre ellos se agregaron:

- `email`
- `estado`

Estos cambios permiten diferenciar funcionalmente la nueva revisión de la versión estable.

## Arquitectura Canary

El flujo general es:

```text
                    GitHub
                       |
                       v
                GitHub Actions
                       |
              +--------+--------+
              |                 |
           Tests             Build
              |                 |
              +--------+--------+
                       |
                       v
               Docker Image
                       |
                       v
             Artifact Registry
                       |
                       v
                  Cloud Run
                  /                        /                         v           v
          V1 Stable      V4 Canary
                \           /
                 \         /
                  Traffic
                  Splitting
```

Google Cloud Monitoring se utiliza para observar el comportamiento de las revisiones durante el despliegue.

## Etapas del Canary

La nueva revisión V4 se despliega inicialmente sin tráfico público.

El pipeline realiza el siguiente proceso:

| Etapa | Tráfico V4 Canary | Acción |
|---|---:|---|
| 0 | 0% | Despliegue de V4 sin tráfico |
| 1 | 5% | Primera exposición al tráfico |
| 2 | 25% | Incremento progresivo |
| 3 | 50% | Incremento progresivo |
| 4 | 100% | Promoción completa de V4 |

Entre las etapas se realiza un Bake Time para observar el comportamiento de la aplicación antes de aumentar nuevamente el tráfico.

El pipeline actual utiliza un tiempo de observación de 15 segundos entre las etapas Canary.

## Validación del Canary

Antes de avanzar entre las etapas, el pipeline realiza validaciones sobre la nueva revisión.

Se realizan comprobaciones de:

- disponibilidad de la revisión;
- respuestas HTTP;
- solicitudes exitosas;
- errores HTTP;
- latencia.

El objetivo es evitar avanzar a la siguiente etapa si la nueva revisión no cumple las condiciones definidas en el pipeline.

## Imagen inmutable

La imagen desplegada se identifica mediante su digest SHA256.

El pipeline obtiene el digest de la imagen publicada en Artifact Registry y utiliza la referencia inmutable para desplegar la revisión Canary.

Esto permite que las diferentes etapas del despliegue trabajen sobre el mismo artefacto.

## Observabilidad

La observabilidad del despliegue se realiza mediante Google Cloud Monitoring.

Se creó el dashboard:

```text
Hotel V4 Canary - Observabilidad
```

Actualmente contiene los siguientes widgets:

### Tráfico por revisión V1 vs V4

Muestra la cantidad de solicitudes asociadas a las diferentes revisiones del servicio `hotel-v4-canary`.

### Errores HTTP 5xx del Canary

Muestra las respuestas HTTP de clase 5xx del servicio Canary.

### Latencia P99 del Canary

Muestra el percentil 99 de la latencia de las solicitudes.

### Instancias activas por revisión

Muestra las instancias activas asociadas a las diferentes revisiones.

Estas métricas permiten observar el comportamiento del servicio durante las etapas del Canary.

## Traffic Splitting

La distribución de tráfico se realiza mediante Cloud Run.

Durante el despliegue progresivo, el tráfico pasa por las siguientes etapas:

```text
V1 Stable 100% / V4 Canary 0%
        |
        v
V1 Stable 95% / V4 Canary 5%
        |
        v
V1 Stable 75% / V4 Canary 25%
        |
        v
V1 Stable 50% / V4 Canary 50%
        |
        v
V1 Stable 0% / V4 Canary 100%
```

El pipeline automatiza la modificación de los porcentajes y realiza la validación correspondiente antes de continuar.

## Expand / Contract

Los cambios de V4 se realizaron buscando mantener la compatibilidad durante la convivencia de V1 y V4.

La nueva versión incorpora los campos:

```text
email
estado
```

Durante el despliegue Canary V1 continúa disponible mientras V4 recibe tráfico de forma progresiva.

La estrategia permite que las dos revisiones convivan durante la transición y que la nueva versión sea validada antes de completar la promoción.

## Evidencias del despliegue

Durante las pruebas del proyecto se verificó:

- despliegue de V4 sin tráfico;
- smoke test de la nueva revisión;
- Canary al 5%;
- Bake Time;
- validación del 5%;
- Canary al 25%;
- Bake Time;
- validación del 25%;
- Canary al 50%;
- Bake Time;
- validación del 50%;
- promoción al 100%;
- validación final;
- utilización de imagen mediante digest;
- observabilidad mediante Cloud Monitoring.

## Versionamiento

Las revisiones de Cloud Run utilizadas en el despliegue se identifican como:

```text
V1 Stable
V4 Canary
```

Esto corresponde a la estrategia de revisiones utilizada en Cloud Run y es independiente del Semantic Versioning utilizado para los releases del repositorio.

Los commits utilizan GitMoji.

## Estructura del proyecto

De forma general:

```text
hotel-fastify/
│
├── .github/
│   └── workflows/
│       └── canary-pipeline.yml
│
├── docker/
│
├── src/
│   ├── config/
│   ├── entities/
│   ├── routes/
│   └── observability/
│
├── tests/
│   └── integration/
│
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Autor

Samuel Giraldo
