# Proyecto Hotel

Este proyecto consiste en una API REST para manejar información básica de un hotel.

La aplicación permite registrar huéspedes, habitaciones y check-ins. También permite consultar, actualizar y eliminar la información guardada.

El proyecto fue realizado usando Fastify, TypeScript y MySQL.

## Tecnologías usadas

Para realizar el proyecto se utilizaron las siguientes tecnologías:

- Node.js
- TypeScript
- Fastify
- MySQL
- TypeORM
- Vitest
- Docker
- Docker Compose
- GitHub Actions
- Railway
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

Primero se debe clonar el repositorio desde GitHub:

```bash
git clone https://github.com/sgiraldor/hotel-fastify.git
```

Después entrar a la carpeta del proyecto:

```bash
cd hotel-fastify
```

## Instalar las dependencias

Para instalar las dependencias del proyecto se ejecuta:

```bash
npm install
```

## Variables de entorno

Para trabajar de forma local se debe crear un archivo llamado:

```text
.env
```

En este archivo se colocan los datos necesarios para conectarse a MySQL.

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

Para iniciar el proyecto en modo desarrollo se utiliza:

```bash
npm run dev
```

La aplicación se ejecuta normalmente en:

```text
http://localhost:3000
```

Para verificar que la API está funcionando se puede hacer una petición GET a:

```text
/
```

La respuesta debe ser parecida a:

```json
{
  "message": "Hotel funcionando"
}
```

## Rutas de Huesped

Crear un huésped:

```text
POST /huesped
```

Consultar todos los huéspedes:

```text
GET /huesped
```

Consultar un huésped por su id:

```text
GET /huesped/:id
```

Actualizar un huésped:

```text
PATCH /huesped/:id
```

Eliminar un huésped:

```text
DELETE /huesped/:id
```

## Rutas de Habitacion

Crear una habitación:

```text
POST /habitacion
```

Consultar todas las habitaciones:

```text
GET /habitacion
```

Consultar una habitación por su id:

```text
GET /habitacion/:id
```

Actualizar una habitación:

```text
PATCH /habitacion/:id
```

Eliminar una habitación:

```text
DELETE /habitacion/:id
```

## Rutas de CheckIn

Crear un check-in:

```text
POST /checkin
```

Consultar los check-ins:

```text
GET /checkin
```

Consultar un check-in por su id:

```text
GET /checkin/:id
```

Actualizar un check-in:

```text
PATCH /checkin/:id
```

Eliminar un check-in:

```text
DELETE /checkin/:id
```

## Pruebas

El proyecto tiene pruebas unitarias y pruebas de integración realizadas con Vitest.

Para ejecutar las pruebas se utiliza:

```bash
npm test
```

Para ejecutar las pruebas y mirar la cobertura se utiliza:

```bash
npm run test:coverage
```

Actualmente el proyecto tiene más del 85% de cobertura general.

## Docker

El proyecto también se puede ejecutar usando Docker.

Se utiliza Docker para levantar la API y la base de datos MySQL en contenedores.

Para construir y levantar los contenedores se utiliza:

```bash
docker compose up --build
```

Para mirar los contenedores que están funcionando:

```bash
docker compose ps
```

Se deben mostrar los servicios de la API y MySQL.

Por ejemplo:

```text
hotel-api
hotel-mysql
```

La API queda disponible en:

```text
http://localhost:3000
```

Para detener los contenedores se utiliza:

```bash
docker compose down
```

## Base de datos

El proyecto utiliza MySQL como base de datos.

Las tablas principales son:

```text
huesped
habitacion
checkin
```

Estas tablas permiten guardar la información utilizada por la API.

## GitHub Actions

El proyecto utiliza GitHub Actions para ejecutar los pipelines automáticamente.

Se crearon dos pipelines:

```text
Pipeline de Pruebas
Pipeline de Produccion
```

Cada pipeline tiene su propio ambiente.

## Pipeline de Pruebas

El pipeline de pruebas se ejecuta cuando se realiza un push a la rama main.

Este pipeline realiza los siguientes pasos:

1. Descarga el código del repositorio.
2. Configura Node.js.
3. Instala las dependencias.
4. Compila el proyecto.
5. Ejecuta las pruebas.
6. Ejecuta la cobertura.
7. Si todo funciona correctamente, realiza el despliegue al ambiente de pruebas.

El ambiente de pruebas debe tener mínimo 60% de cobertura.

Si alguna prueba falla, el pipeline se detiene y no realiza el despliegue.

## Pipeline de Produccion

El pipeline de producción también realiza varias verificaciones antes de desplegar la aplicación.

Los pasos principales son:

1. Descargar el código.
2. Configurar Node.js.
3. Instalar las dependencias.
4. Compilar el proyecto.
5. Ejecutar las pruebas.
6. Revisar la cobertura.
7. Desplegar la aplicación en producción.

Para producción se configuró un Quality Gate de mínimo 85% de cobertura.

Si no se alcanza ese porcentaje o alguna prueba falla, el pipeline se detiene y no se realiza el despliegue.

## Ambientes

El proyecto tiene dos ambientes separados:

### Ambiente de pruebas

Se utiliza para probar los cambios antes de considerarlos listos para producción.

### Ambiente de producción

Es el ambiente donde se encuentra la versión final de la aplicación.

Los dos ambientes tienen configuración independiente en Railway.

## Railway

Railway se utilizó para desplegar la aplicación y las bases de datos MySQL.

La aplicación de producción se encuentra en:

```text
https://hotel-production-4bd4.up.railway.app
```

Para comprobar que está funcionando se puede entrar a esa dirección y debe aparecer:

```json
{
  "message": "Hotel funcionando"
}
```

Los despliegues se realizan desde los pipelines usando Railway CLI.

Los tokens necesarios para realizar los despliegues están guardados como Secrets en GitHub y no directamente dentro del código.

## Estructura del proyecto

De forma general el proyecto está organizado así:

```text
hotel-fastify/
│
├── .github/
│   └── workflows/
│
├── docker/
│
├── src/
│   ├── config/
│   ├── entities/
│   ├── routes/
│   └── utils/
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

## Resumen

Con este proyecto se realizó una API REST para un hotel utilizando Fastify y MySQL.

También se agregaron pruebas automáticas, cobertura de código, Docker y dos pipelines de CI/CD.

Los pipelines permiten comprobar que el proyecto funciona antes de realizar los despliegues en los ambientes de pruebas y producción.

## Autor

Samuel Giraldo