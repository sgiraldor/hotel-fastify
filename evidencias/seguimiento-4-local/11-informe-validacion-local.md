# Informe de validación local

## 1. Docker
Daemon activo. Compose v5.4.0. Imagen `hotel-fastify-api` construida correctamente tras conflicto con contenedor antiguo `hotel-api` (eliminado el contenedor, **sin** borrar volumen `hotel_mysql_data`).

## 2. MySQL
Contenedor `hotel-mysql` healthy en `3307->3306`. Schema existente reutilizado.

## 3. Hotel API
Contenedor `hotel-api` healthy. Logs: `Base de datos conectada` + listen `:3000`.

## 4. Endpoints (códigos reales)
Ver JSON `04-*.json` y `05-*.json`.

## 5. Trace ID
Propagación verificada (`sports-e2e-real-001` eco; UUID generado sin header; legacy sin eco forzado).

## 6. Indisponibilidad
Activación/desactivación y header tokenizado verificados. `/live` no afectado.

## 7. Resiliencia
Modos protected/unprotected confirmados vía `/metrics` tras recrear contenedor. 503 de caos **no** se contabiliza como éxito.

## 8. Chaos Toolkit
CLI no instalada. Equivalente ejecutado: `node chaos/run-local.mjs` → éxito.

## 9. Dependencias pendientes
OCI/OKE deploy, OTLP real, k6 de Jarrison, CB en Sports, Cine.
