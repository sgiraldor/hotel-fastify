import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { publicarMensaje } from '../clients/queue.client';

export async function queueRoutes(app: FastifyInstance) {

  app.post('/api/v2/queue/test', async (request, reply) => {

    const incomingTraceId = request.headers['x-trace-id'];

    const traceId =
      typeof incomingTraceId === 'string'
        ? incomingTraceId
        : randomUUID();

    try {

      const mensaje = {
        traceId,
        tipo: 'PRUEBA_COLA',
        origen: 'orchestrator',
        data: {
          mensaje: 'Prueba de OCI Queue desde el orquestador',
        },
        timestamp: new Date().toISOString(),
      };

      await publicarMensaje(mensaje);

      reply.header('x-trace-id', traceId);

      return reply.code(201).send({
        message: 'Mensaje enviado correctamente a OCI Queue',
        traceId,
      });

    } catch (error) {

      app.log.error({
        error,
        traceId,
      });

      return reply.code(500).send({
        message: 'Error enviando mensaje a OCI Queue',
        traceId,
      });
    }
  });
}