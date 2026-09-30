import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import {
  ejecutarFlujoOrquestado,
  ejecutarFlujoDinamico,
} from '../services/orchestrator.service';

interface FlujoDinamicoBody {
  origen: 'hotel' | 'sports' | 'cine';
  data: unknown;
}

export async function orchestratorRoutes(app: FastifyInstance) {

  // --------------------------------------------------
  // FLUJO ORIGINAL POR ID
  // --------------------------------------------------

  app.get(
    '/api/v2/orchestrator/flujo/:habitacionId/:jugadorId/:peliculaId',
    async (request, reply) => {

      const { habitacionId, jugadorId, peliculaId } =
        request.params as {
          habitacionId: string;
          jugadorId: string;
          peliculaId: string;
        };

      const incomingTraceId = request.headers['x-trace-id'];

      const traceId =
        typeof incomingTraceId === 'string'
          ? incomingTraceId
          : randomUUID();

      try {

        const resultado = await ejecutarFlujoOrquestado(
          Number(habitacionId),
          Number(jugadorId),
          Number(peliculaId),
          traceId,
          app.log
        );

        reply.header('x-trace-id', traceId);

        return reply.send(resultado);

      } catch (error) {

        app.log.error({
          error,
          traceId,
        });

        reply.header('x-trace-id', traceId);

        return reply.code(502).send({
          message: 'Error ejecutando el flujo del orquestador',
          traceId,
        });
      }
    }
  );


  // --------------------------------------------------
  // FLUJO DINAMICO
  // --------------------------------------------------

  app.post<{ Body: FlujoDinamicoBody }>(
    '/api/v2/orchestrator/dinamico',
    async (request, reply) => {

      const incomingTraceId = request.headers['x-trace-id'];

      const traceId =
        typeof incomingTraceId === 'string'
          ? incomingTraceId
          : randomUUID();

      try {

        const { origen, data } = request.body;

        if (!origen || data === undefined || data === null) {
          return reply.code(400).send({
            message: 'Debe enviar origen y data',
            traceId,
          });
        }

        if (
          origen !== 'hotel' &&
          origen !== 'sports' &&
          origen !== 'cine'
        ) {
          return reply.code(400).send({
            message: 'Origen no valido. Use hotel, sports o cine',
            traceId,
          });
        }

        const resultado = await ejecutarFlujoDinamico(
          origen,
          data,
          traceId
        );

        reply.header('x-trace-id', traceId);

        return reply.send(resultado);

      } catch (error) {

        app.log.error({
          error,
          traceId,
        });

        reply.header('x-trace-id', traceId);

        return reply.code(502).send({
          message: 'Error ejecutando el flujo dinamico',
          traceId,
        });
      }
    }
  );
}