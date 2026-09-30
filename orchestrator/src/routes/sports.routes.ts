import { FastifyInstance } from 'fastify';
import { obtenerJugadorPorId } from '../clients/sports.client';
import { traceIdDeLaPeticion } from '../plugins/trace-id.plugin';

export async function sportsRoutes(app: FastifyInstance) {

    app.get('/api/v2/sports/jugadores/:id', async (request, reply) => {

        const { id } = request.params as { id: string };

        const traceId = traceIdDeLaPeticion(request);

        try {
            const jugador = await obtenerJugadorPorId(
                Number(id),
                traceId
            );

            reply.header('x-trace-id', traceId);

            return reply.send(jugador);

        } catch (error) {
            app.log.error({
                error,
                traceId,
            });

            reply.header('x-trace-id', traceId);

            return reply.code(502).send({
                message: 'Error comunicandose con Sports API',
                traceId,
            });
        }
    });
}