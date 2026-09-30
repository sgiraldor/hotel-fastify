import { FastifyInstance } from 'fastify';
import { obtenerHuespedPorId } from '../clients/hotel.client';
import { traceIdDeLaPeticion } from '../plugins/trace-id.plugin';

export async function hotelRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    '/api/v2/hotel/huesped/:id',
    async (request, reply) => {
      const traceId = traceIdDeLaPeticion(request);
      reply.header('x-trace-id', traceId);

      try {
        const id = Number(request.params.id);

        if (Number.isNaN(id)) {
          return reply.code(400).send({
            message: 'El id del huésped no es válido',
          });
        }

        const huesped = await obtenerHuespedPorId(id, traceId);

        return reply.code(200).send(huesped);
      } catch (error) {
        app.log.error(error);

        return reply.code(502).send({
          message: 'Error al comunicarse con Hotel API',
        });
      }
    },
  );
}