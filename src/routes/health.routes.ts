import { FastifyInstance } from 'fastify';
import { AppDataSource } from '../config/database';

/**
 * /live  — proceso vivo (no depende de MySQL; caos academico no debe tumbarlo).
 * /ready — listo para trafico solo si la DB responde.
 */
export async function healthRoutes(app: FastifyInstance) {
  app.get('/live', async (_request, reply) => {
    return reply.code(200).send({
      status: 'alive',
      service: 'hotel-api',
    });
  });

  app.get('/ready', async (_request, reply) => {
    try {
      if (!AppDataSource.isInitialized) {
        return reply.code(503).send({
          status: 'not_ready',
          reason: 'database_not_initialized',
          service: 'hotel-api',
        });
      }

      await AppDataSource.query('SELECT 1');

      return reply.code(200).send({
        status: 'ready',
        service: 'hotel-api',
      });
    } catch {
      return reply.code(503).send({
        status: 'not_ready',
        reason: 'database_unavailable',
        service: 'hotel-api',
      });
    }
  });
}
