import 'reflect-metadata';
import fastify from 'fastify';
import { AppDataSource } from './config/database';
import { huespedRoutes } from './routes/huesped.routes';

const app = fastify();

app.register(huespedRoutes);

app.get('/', async () => {
  return { message: 'Hotel funcionando' };
});

const start = async () => {
  try {
    
    await AppDataSource.initialize();
    console.log('Base de datos conectada');

    await app.listen({ port: 3000 });
    console.log('Servidor ejecutándose en http://localhost:3000');
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();