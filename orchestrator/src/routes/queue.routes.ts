import { FastifyInstance } from 'fastify';
import { publicarMensaje } from '../clients/queue.client';
import { consumirMensajes } from '../services/queue-consumer.service';
import { traceIdDeLaPeticion } from '../plugins/trace-id.plugin';

export async function queueRoutes(app: FastifyInstance) {

  // --------------------------------------------------
  // PUBLICAR MENSAJE DE PRUEBA
  // --------------------------------------------------

  app.post('/api/v2/queue/test', async (request, reply) => {

    const traceId = traceIdDeLaPeticion(request);

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

      reply.header('x-trace-id', traceId);

      return reply.code(500).send({
        message: 'Error enviando mensaje a OCI Queue',
        traceId,
      });
    }
  });


  // --------------------------------------------------
  // CONSUMIR MENSAJES DE LA COLA
  // --------------------------------------------------

  app.post('/api/v2/queue/consume', async (request, reply) => {

    const traceId = traceIdDeLaPeticion(request);

    try {

      const resultado = await consumirMensajes();

      reply.header('x-trace-id', traceId);

      return reply.code(200).send({
        traceId,
        ...resultado,
      });

    } catch (error) {

      app.log.error({
        error,
        traceId,
      });

      reply.header('x-trace-id', traceId);

      return reply.code(500).send({
        message: 'Error consumiendo mensajes de OCI Queue',
        traceId,
      });
    }
  });
}