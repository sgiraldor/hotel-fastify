import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { obtenerPeliculaPorId } from '../clients/cine.client';

export async function cineRoutes(app: FastifyInstance) {

    app.get('/api/v2/cine/peliculas/:id', async (request, reply) => {

        console.log('>>> ENTRE A CINE ROUTE <<<');


        const { id } = request.params as { id: string };


        const incomingTraceId = request.headers['x-trace-id'];

        const traceId =
            typeof incomingTraceId === 'string'
                ? incomingTraceId
                : randomUUID();


        console.log({
            evento: 'ruta_cine_recibida',
            id,
            traceId,
        });


        try {

            console.log('>>> ANTES DE LLAMAR CINE CLIENT <<<');


            const pelicula = await obtenerPeliculaPorId(
                Number(id),
                traceId,
                app.log
            );


            console.log({
                evento: 'RESPUESTA_DESDE_CINE_CLIENT',
                pelicula,
                traceId,
            });


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