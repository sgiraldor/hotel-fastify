import 'reflect-metadata';
import fastify from 'fastify';
import { AppDataSource } from './config/database';
import { huespedRoutes } from './routes/huesped.routes';
import { habitacionRoutes } from './routes/habitacion.routes';
import { checkinRoutes } from './routes/checkin.routes';

const app = fastify();

app.register(huespedRoutes);
app.register(habitacionRoutes);
app.register(checkinRoutes);

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
      host: '0.0.0.0'
    });

    console.log(`Servidor ejecutándose en el puerto ${port}`);

  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();