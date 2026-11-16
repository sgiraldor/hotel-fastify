import './observability/otel';
import 'reflect-metadata';
import fastify from 'fastify';
import { AppDataSource } from './config/database';
import { huespedRoutes } from './routes/huesped.routes';
import { habitacionRoutes } from './routes/habitacion.routes';
import { checkinRoutes } from './routes/checkin.routes';
import { habitacionV2Routes } from './routes/v2/habitacion-v2.routes';
import { registrarMetricas } from './observability/metrics';
import { registrarMetricasHttp } from './observability/http-metrics';
import { camposDeCorrelacion } from './observability/log-context';
import { traceIdHook } from './plugins/trace-id.plugin';

const app = fastify({
  logger: {
    level: 'info',
    mixin() {
      return camposDeCorrelacion();
    },
  },
});

app.addHook('onRequest', traceIdHook);
registrarMetricas(app);
registrarMetricasHttp(app, 'hotel-api');

app.register(huespedRoutes);
app.register(habitacionRoutes);
app.register(checkinRoutes);
app.register(habitacionV2Routes);

// Endpoint de falla controlada exclusivo para pruebas Canary
app.get('/canary/failure', async (_request, reply) => {
  return reply.code(500).send({
    message: 'Falla controlada de Canary',
    version: '4.0.0',
    track: 'canary',
  });
});

app.get('/', async () => {
  return {
    message: 'Hotel funcionando',
    version: '4.0.0',
    track: 'canary',
  };
});

const start = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Base de datos conectada');

    const port = Number(process.env.PORT) || 3000;

    await app.listen({
      port,
      host: '0.0.0.0',
    });

    console.log(`Servidor ejecutándose en el puerto ${port}`);
  } catch (error) {
    console.error('ERROR AL INICIAR LA API:', error);
    app.log.error(error);
    process.exit(1);
  }
};

start();
