# 🏨 Hotel API V2 - Arquitectura Multicloud

Este proyecto corresponde a la evolución de **Hotel API V1** hacia una arquitectura **multicloud**, desarrollada para el Seguimiento #2 del Énfasis DevOps 2026-2.

La primera versión del proyecto consistía en una API REST para administrar huéspedes, habitaciones y check-ins de un hotel.

Para la segunda entrega, el proyecto evoluciona hacia una arquitectura distribuida entre **Oracle Cloud Infrastructure (OCI), Microsoft Azure y Google Cloud Platform (GCP)**, utilizando Kubernetes, integración entre APIs, mensajería, orquestación y observabilidad distribuida.

> **Versión actual en desarrollo: Hotel API V2**

La primera entrega se conserva mediante el tag:

```text
v1.0.0
```

La rama `main` contiene actualmente el desarrollo correspondiente a la **V2**.

---

## 📌 Versiones del proyecto

### V1 - Primera entrega

La primera versión del proyecto utilizó:

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

La V1 implementó una API REST para las entidades:

- Huesped
- Habitacion
- CheckIn

También incluyó pruebas, cobertura de código, pipelines de CI/CD y despliegues separados de pruebas y producción.

Esta versión se encuentra identificada con:

```text
v1.0.0
```

---

### V2 - Segunda entrega

La V2 transforma el proyecto hacia una arquitectura:

```text
Multicloud + Kubernetes + Microservicios + Mensajería + Observabilidad
```

En esta nueva entrega se utilizará únicamente un **ambiente de producción**.

Los pipelines de GitHub Actions de la primera entrega fueron desactivados y se conservan únicamente como evidencia histórica.

---

# ☁️ Arquitectura Multicloud

La solución está distribuida entre tres integrantes y tres proveedores de nube.

| Integrante | Nube | Entidades |
|---|---|---|
| Samuel Giraldo | Oracle Cloud Infrastructure (OCI) | Huesped, Habitacion, CheckIn |
| Daniel | Microsoft Azure | Pelicula, Sala, Reserva |
| Jarrison | Google Cloud Platform (GCP) | Cancha, Jugador, Torneo |

Cada integrante es responsable de desplegar su API y administrar únicamente las entidades que le corresponden.

Las APIs deberán comunicarse entre sí mediante HTTP cuando necesiten información perteneciente a otra nube.

La lógica y las entidades de los demás integrantes no deberán duplicarse localmente.

---

# 👨‍💻 Componente Oracle Cloud - Samuel Giraldo

Este repositorio corresponde principalmente al componente de **Hotel API V2**, cuya nube asignada es:

```text
Oracle Cloud Infrastructure - OCI
```

Las entidades propias son:

```text
Huesped
Habitacion
CheckIn
```

Además del desarrollo de la API V2, las responsabilidades asignadas para esta entrega son:

- Desplegar la API en Oracle Cloud.
- Crear y utilizar un clúster de Kubernetes.
- Utilizar ORM para la persistencia de datos.
- Implementar el MS Orquestador.
- Implementar la Cola / Tópico.
- Integrar la API con las APIs de Azure y GCP.
- Permitir consultas que incluyan información de otras APIs.
- Propagar un `trace-id` entre los servicios.
- Participar en la implementación de observabilidad distribuida.
- Manejar procesamiento asíncrono.
- Contemplar el manejo y reproceso de fallos.

---

# 🔗 API V2

Los nuevos endpoints correspondientes a la segunda entrega utilizarán el prefijo:

```text
/api/v2
```

Esto permite diferenciar claramente la nueva arquitectura de los endpoints desarrollados durante la primera entrega.

Las entidades propias de Hotel API son:

### Huesped

Guarda la información de las personas que llegan al hotel.

### Habitacion

Guarda la información de las habitaciones del hotel.

### CheckIn

Relaciona un huésped con una habitación y almacena información correspondiente a su estadía y pago.

---

# 🌎 Integración entre APIs

Una de las características principales de la V2 será la reutilización de información perteneciente a otras APIs.

Hotel API no deberá copiar las entidades pertenecientes a Daniel o Jarrison dentro de su propia base de datos.

Cuando sea necesario obtener esta información se realizará una comunicación mediante HTTP con la API correspondiente.

La arquitectura general contempla:

```text
Cliente / Postman
        |
        v
API Gateway / DNS
        |
        v
MS Orquestador
     /     \
    /       \
   v         v
Cola       APIs V2
/Tópico    Multicloud
             |
     -------------------
     |        |        |
     v        v        v
    OCI     Azure     GCP
```

Las llamadas entre las APIs permitirán reutilizar entidades sin duplicar su lógica.

---

# ☸️ Kubernetes

Para la segunda entrega, cada API deberá ejecutarse utilizando un **clúster de Kubernetes**.

Para Hotel API, el clúster estará ubicado en:

```text
Oracle Cloud Infrastructure
```

La arquitectura de despliegue deberá contemplar los recursos necesarios de Kubernetes para ejecutar y exponer la aplicación en producción.

La V2 deja atrás el modelo de despliegue principal utilizado en la primera entrega con Docker y Railway.

Docker se conserva dentro del repositorio como parte de la documentación e historial de la V1.

---

# 🗄️ Base de datos y ORM

El proyecto utiliza **TypeORM** como ORM.

El ORM permite administrar la comunicación entre la aplicación y la base de datos mediante las entidades definidas en TypeScript.

Las entidades propias de Hotel API son:

```text
Huesped
Habitacion
CheckIn
```

Cada API será responsable únicamente de la persistencia de sus propias entidades.

La información perteneciente a otras APIs será obtenida mediante comunicación HTTP.

---

# 🧩 MS Orquestador

Una de las responsabilidades principales de este componente dentro de la segunda entrega será la implementación de un:

```text
MS Orquestador
```

El orquestador tendrá como objetivo coordinar los diferentes pasos de un flujo que involucre múltiples servicios.

De forma general, el flujo esperado será:

```text
Cliente
   |
   v
API Gateway
   |
   v
MS Orquestador
   |
   +----> Hotel API - OCI
   |
   +----> API Azure
   |
   +----> API GCP
   |
   +----> Cola / Tópico
```

El orquestador también deberá contribuir a mantener la trazabilidad de las solicitudes mediante un:

```text
trace-id
```

Este identificador permitirá relacionar una petición mientras atraviesa diferentes servicios y proveedores de nube.

---

# 📨 Cola / Tópico

La arquitectura V2 incorporará un mecanismo de mensajería mediante una:

```text
Cola / Tópico
```

Este componente será responsabilidad de Samuel dentro de la arquitectura general.

Su propósito será permitir el procesamiento de pasos asíncronos del flujo.

La solución deberá contemplar aspectos como:

- Envío de mensajes.
- Consumo de mensajes.
- Procesamiento asíncrono.
- Identificación del flujo mediante `trace-id`.
- Manejo de errores.
- Reproceso de mensajes fallidos.

La implementación específica se irá documentando conforme avance el desarrollo.

---

# ⚡ Caché distribuida

Dentro de la arquitectura multicloud también se utilizará una **caché distribuida**.

Este componente corresponde al integrante encargado de la nube Azure.

Su objetivo será permitir el almacenamiento temporal de información utilizada entre servicios, utilizando estrategias como:

```text
TTL
```

e invalidación de datos cuando sea necesario.

Hotel API podrá consumir este componente dentro de los flujos definidos por la arquitectura.

---

# 📦 Object Storage

La arquitectura también contempla un servicio de:

```text
Object Storage
```

Este componente corresponde al integrante encargado de Google Cloud Platform.

Su función será permitir el almacenamiento de objetos o archivos asociados a los mensajes y flujos distribuidos.

---

# 📊 Observabilidad

La V2 deberá implementar una capa transversal de observabilidad que permita supervisar los componentes desplegados en las tres nubes.

La arquitectura contempla una herramienta SaaS de observabilidad.

Entre las alternativas planteadas se encuentran:

```text
Grafana Cloud
Datadog
New Relic
Elastic
```

La herramienta definitiva será seleccionada durante la implementación.

---

## Métricas RED

Se deberán recopilar métricas por endpoint relacionadas con:

- Peticiones.
- Errores.
- Latencia.
- p50.
- p95.
- Caché.
- Cola.

Esto permitirá conocer el comportamiento de los diferentes servicios.

---

## Logs centralizados

Los logs de los servicios desplegados en las diferentes nubes deberán poder consultarse de manera centralizada.

Los logs deberán estar relacionados mediante el:

```text
trace-id
```

Esto permitirá seguir una misma petición a través de varios servicios.

---

## Trazas distribuidas

La arquitectura contempla la utilización de:

```text
OpenTelemetry
```

para implementar trazas distribuidas.

El objetivo será poder observar el recorrido extremo a extremo de una petición o mensaje.

Por ejemplo:

```text
Cliente
   |
   v
Orquestador
   |
   v
Hotel API
   |
   v
API externa
   |
   v
Cola
```

Todo el recorrido podrá relacionarse mediante el mismo `trace-id`.

---

## Alertas y dashboard

La solución deberá contar con un tablero unificado que permita visualizar el comportamiento general de los servicios.

También se deberán configurar alertas que permitan identificar situaciones como:

- Errores.
- Latencias elevadas.
- Fallos en servicios.
- Problemas durante el procesamiento de mensajes.

---

# 🚀 Ambiente de producción

Para esta segunda entrega se utilizará únicamente:

```text
Producción
```

Ya no se manejarán los dos ambientes utilizados durante la primera entrega.

La infraestructura de la V2 estará distribuida entre:

```text
Oracle Cloud Infrastructure
Microsoft Azure
Google Cloud Platform
```

---

# 🚫 Pipelines desactivados

Durante la primera entrega se utilizaron dos pipelines de GitHub Actions:

```text
Pipeline de Pruebas
Pipeline de Producción
```

Para la segunda entrega estos pipelines fueron desactivados según los nuevos requerimientos del proyecto.

Los archivos fueron trasladados a:

```text
.github/workflows-disabled/
```

De esta manera GitHub Actions deja de ejecutarlos automáticamente, pero se conserva su configuración como evidencia de la primera entrega.

---

# 📁 Estructura actual del proyecto

De forma general, el repositorio mantiene una estructura similar a:

```text
hotel-fastify/
│
├── .github/
│   └── workflows-disabled/
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
├── vitest.config.mts
└── README.md
```

Esta estructura será ampliada durante el desarrollo de la V2 para incorporar los componentes correspondientes a Kubernetes, orquestación, mensajería e integración multicloud.

---

# 💻 Tecnologías

## Tecnologías base

- Node.js
- TypeScript
- Fastify
- TypeORM
- Git
- GitHub

## Primera entrega

- MySQL
- Vitest
- Docker
- Docker Compose
- GitHub Actions
- Railway

## Segunda entrega

La arquitectura V2 incorpora:

- Oracle Cloud Infrastructure
- Kubernetes
- Integración HTTP entre APIs
- Microservicios
- MS Orquestador
- Cola / Tópico
- Caché distribuida
- Object Storage
- OpenTelemetry
- Observabilidad SaaS

---

# 🧪 Pruebas

El proyecto cuenta con pruebas desarrolladas con:

```text
Vitest
```

Para ejecutar las pruebas:

```bash
npm test
```

Para ejecutar las pruebas junto con la cobertura:

```bash
npm run test:coverage
```

Las pruebas y cobertura desarrolladas durante la primera entrega se conservan dentro del proyecto.

---

# 🖥️ Ejecución local

Para trabajar con el proyecto localmente se debe tener instalado:

- Node.js
- npm
- Git

Primero se clona el repositorio:

```bash
git clone https://github.com/sgiraldor/hotel-fastify.git
```

Luego se ingresa a la carpeta:

```bash
cd hotel-fastify
```

Se instalan las dependencias:

```bash
npm install
```

---

# 🔐 Variables de entorno

La aplicación utiliza variables de entorno para almacenar configuraciones que no deben escribirse directamente dentro del código.

Para desarrollo local se utiliza un archivo:

```text
.env
```

Ejemplo de la configuración utilizada por la V1:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=contraseña
DB_NAME=hotel
```

Las variables necesarias para la V2 se irán incorporando conforme se implementen las conexiones con los diferentes servicios.

Los secretos y credenciales reales no deben almacenarse directamente en el repositorio.

---

# ▶️ Ejecutar la API

Para iniciar el proyecto localmente en modo desarrollo:

```bash
npm run dev
```

La aplicación normalmente estará disponible en:

```text
http://localhost:3000
```

Para comprobar que el servidor está funcionando se puede realizar:

```text
GET /
```

La respuesta esperada es similar a:

```json
{
  "message": "Hotel funcionando"
}
```

---

# 📚 API V1 - Documentación histórica

Las siguientes rutas corresponden a la primera entrega del proyecto.

Se conservan dentro del README como documentación de la evolución de Hotel API.

---

## Rutas de Huesped

Crear un huésped:

```text
POST /huesped
```

Consultar todos los huéspedes:

```text
GET /huesped
```

Consultar un huésped por ID:

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

---

## Rutas de Habitacion

Crear una habitación:

```text
POST /habitacion
```

Consultar todas las habitaciones:

```text
GET /habitacion
```

Consultar una habitación por ID:

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

---

## Rutas de CheckIn

Crear un check-in:

```text
POST /checkin
```

Consultar los check-ins:

```text
GET /checkin
```

Consultar un check-in por ID:

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

---

# 🐳 Docker - V1

Durante la primera entrega el proyecto podía ejecutarse utilizando Docker.

Docker se utilizó para levantar la API y MySQL mediante contenedores.

Para construir los contenedores se utilizaba:

```bash
docker compose up --build
```

Para consultar los contenedores:

```bash
docker compose ps
```

Y para detenerlos:

```bash
docker compose down
```

> Esta configuración pertenece a la V1. La infraestructura objetivo de la V2 utiliza Kubernetes.

---

# ⚙️ GitHub Actions - V1

La primera entrega utilizó GitHub Actions para ejecutar automáticamente pipelines.

Se crearon:

```text
Pipeline de Pruebas
Pipeline de Producción
```

Los pipelines realizaban tareas como:

1. Descargar el código.
2. Configurar Node.js.
3. Instalar dependencias.
4. Compilar el proyecto.
5. Ejecutar pruebas.
6. Revisar cobertura.
7. Realizar el despliegue.

En la V2 estos pipelines se encuentran desactivados.

Su configuración histórica se conserva en:

```text
.github/workflows-disabled/
```

---

# 🚂 Railway - V1

Durante la primera entrega Railway fue utilizado para desplegar la aplicación y las bases de datos MySQL.

La aplicación V1 fue desplegada en Railway y los despliegues se realizaban utilizando los pipelines configurados con GitHub Actions.

Los tokens necesarios para los despliegues se almacenaban como Secrets y no directamente dentro del código.

> Railway corresponde a la arquitectura de la V1 y no será el proveedor principal de despliegue de Hotel API V2.

---

# 🏷️ Historial de versiones

## v1.0.0

Primera entrega de Hotel API.

Incluye:

- API REST.
- Huesped.
- Habitacion.
- CheckIn.
- Fastify.
- TypeORM.
- MySQL.
- Pruebas.
- Coverage.
- Docker.
- GitHub Actions.
- Railway.
- Ambientes de pruebas y producción.

---

## v2.0.0 - En desarrollo

Segunda entrega del proyecto.

La versión V2 incorporará progresivamente:

- API `/api/v2`.
- Oracle Cloud Infrastructure.
- Kubernetes.
- Integración multicloud.
- Consumo de entidades externas.
- MS Orquestador.
- Cola / Tópico.
- Caché distribuida.
- Object Storage.
- `trace-id`.
- OpenTelemetry.
- Métricas.
- Logs centralizados.
- Trazas distribuidas.
- Alertas.
- Dashboard de observabilidad.

---

# 🎯 Objetivo de la V2

El objetivo de esta nueva versión es evolucionar Hotel API desde una API desplegada de manera tradicional hacia una solución distribuida capaz de comunicarse con servicios desplegados en diferentes proveedores de nube.

La arquitectura final deberá integrar:

```text
                 Cliente / Postman
                         |
                         v
                 API Gateway / DNS
                         |
                         v
                  MS Orquestador
                    /        \
                   /          \
                  v            v
           Cola / Tópico    APIs V2
                              |
                    ---------------------
                    |         |         |
                    v         v         v
                   OCI      Azure      GCP
                    |         |         |
                    ---------------------
                              |
                              v
                     Observabilidad
                  Métricas - Logs - Traces
```

De esta forma, el proyecto permitirá demostrar conceptos de arquitectura multicloud, Kubernetes, integración de servicios, mensajería, reutilización de APIs y observabilidad distribuida.

---

# 👨‍💻 Autor

**Samuel Giraldo**

Énfasis DevOps 2026-2