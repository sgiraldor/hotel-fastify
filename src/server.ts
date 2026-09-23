import 'reflect-metadata';
import fastify from 'fastify';
import { AppDataSource } from './config/database';
import { huespedRoutes } from './routes/huesped.routes';
import { habitacionRoutes } from './routes/habitacion.routes';
import { checkinRoutes } from './routes/checkin.routes';
import { huespedV2Routes } from './routes/v2/huesped-v2.routes';
import { habitacionV2Routes } from './routes/v2/habitacion-v2.routes';
import { checkinV2Routes } from './routes/v2/checkin-v2.routes';
import { traceIdHook } from './plugins/trace-id.plugin';

const app = fastify();

app.addHook('onRequest', traceIdHook);
app.register(huespedRoutes);
app.register(habitacionRoutes);
app.register(checkinRoutes);

app.register(huespedV2Routes);
app.register(habitacionV2Routes);
app.register(checkinV2Routes);

app.get('/', async () => {
  return { message: 'Hotel funcionando' };
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
    app.log.error(error);
    process.exit(1);
  }
};

start();