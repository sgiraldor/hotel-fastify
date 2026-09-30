import { FastifyInstance } from 'fastify';
import { metrics, ValueType } from '@opentelemetry/api';

export const METRIC_HTTP_REQUEST_COUNT = 'http.server.request.count';
export const METRIC_HTTP_ERROR_COUNT = 'http.server.request.error.count';
export const METRIC_HTTP_REQUEST_DURATION = 'http.server.request.duration';

let registradas = false;

export function registrarMetricasHttp(
  app: FastifyInstance,
  nombreMedidor: string,
): void {
  if (registradas) {
    return;
  }

  registradas = true;

  const medidor = metrics.getMeter(nombreMedidor);

  const peticiones = medidor.createCounter(METRIC_HTTP_REQUEST_COUNT, {
    description: 'Cantidad de peticiones HTTP recibidas',
  });

  const errores = medidor.createCounter(METRIC_HTTP_ERROR_COUNT, {
    description: 'Cantidad de peticiones HTTP respondidas con status 5xx',
  });

  const duracion = medidor.createHistogram(METRIC_HTTP_REQUEST_DURATION, {
    description: 'Duracion de las peticiones HTTP',
    unit: 's',
    valueType: ValueType.DOUBLE,
  });

  app.addHook('onResponse', async (request, reply) => {
    const atributos = {
      'http.request.method': request.method,
      'http.route': request.routeOptions.url ?? 'unmatched',
      'http.response.status_code': reply.statusCode,
    };

    peticiones.add(1, atributos);

    if (reply.statusCode >= 500) {
      errores.add(1, atributos);
    }

    duracion.record((reply.elapsedTime ?? 0) / 1000, atributos);
  });
}
