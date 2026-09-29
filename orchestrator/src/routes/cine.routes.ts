import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { obtenerPeliculaPorId } from '../clients/cine.client';

export async function cineRoutes(app: FastifyInstance) {

    app.get('/api/v2/cine/peliculas/:id', async (request, reply) => {

        const { id } = request.params as { id: string };

        const incomingTraceId = request.headers['x-trace-id'];

        const traceId =
            typeof incomingTraceId === 'string'
                ? incomingTraceId
                : randomUUID();

        try {
            const pelicula = await obtenerPeliculaPorId(
                Number(id),
                traceId
            );

            reply.header('x-trace-id', traceId);

            return reply.send(pelicula);

        } catch (error) {
            app.log.error({
                error,
                traceId,
            });

            reply.header('x-trace-id', traceId);

            return reply.code(502).send({
                message: 'Error comunicandose con Cine API',
                traceId,
            });
        }
    });
}