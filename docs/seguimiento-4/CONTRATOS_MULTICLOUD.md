# Contratos multicloud — Hotel API (Samuel)

## Flujo E2E definitivo

```text
Cliente/k6 -> Sports (AWS) -> Hotel (OCI) -> Sports -> Cine (GCP) -> Sports -> Cliente
```

Sports es el coordinador. Hotel **no** llama a Cine ni a Sports.

## Contrato Sports → Hotel

| Campo | Valor |
|---|---|
| Método | `GET` |
| Path relativo | `/api/v2/habitacion/:id` |
| Ejemplo | `GET https://<HOTEL_BASE_URL>/api/v2/habitacion/1` |
| Puerto local | `3000` |

### Headers de entrada

| Header | Obligatorio | Descripción |
|---|---|---|
| `x-trace-id` | Recomendado | Correlation ID de negocio. Si falta, Hotel genera un UUID y lo devuelve. |
| `traceparent` | Opcional | W3C Trace Context. Lo propaga OpenTelemetry (no confundir con span ID). |
| `tracestate` | Opcional | W3C Trace Context vendor state. |

### Headers de salida

| Header | Descripción |
|---|---|
| `x-trace-id` | Mismo valor recibido o UUID generado por Hotel. |

### Respuesta 200 (ejemplo)

```json
{
  "id": 1,
  "numeroHabitacion": "101",
  "precioHabitacion": 120000,
  "estadoHabitacion": "DISPONIBLE",
  "tipoHabitacion": "SIMPLE"
}
```

### Códigos de error

| Código | Cuándo | Cuerpo |
|---|---|---|
| `400` | `id` inválido | `{ "message": "id de habitacion invalido", "traceId": "..." }` |
| `404` | No existe | `{ "message": "Habitacion no encontrada", "traceId": "..." }` |
| `500` | Error interno / DB | `{ "message": "Error al consultar la habitacion", "traceId": "..." }` |
| `503` | Indisponibilidad controlada (caos) | Ver documento de experimento |

### Endpoint legacy (sigue disponible)

`GET /habitacion/:id` se conserva para compatibilidad. **Sports debe usar `/api/v2/habitacion/:id`** para correlación E2E.

## Endpoints que NO cambian

- CRUD `/huesped`, `/habitacion`, `/checkin`
- `GET /`
- `GET /metrics` (JSON Canary)
- `GET /canary/failure`

## Observabilidad

- `OTEL_SERVICE_NAME=hotel-api`
- Export OTLP solo si existe `OTEL_EXPORTER_OTLP_ENDPOINT` (o endpoints específicos de traces/metrics).
- Logs Pino incluyen `xTraceId`, y si hay span activo: `otelTraceId` / `otelSpanId`.

## Notas para Jarrison

1. Generar `x-trace-id` en Sports y reenviarlo a Hotel y Cine.
2. Timeout de cliente Sports→Hotel: acordar (sugerido 2–3 s).
3. Ante `503` de caos, no contar como éxito; aplicar circuit breaker / retry en Sports.
