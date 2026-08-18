import { FastifyInstance } from 'fastify';
import { AppDataSource } from '../config/database';
import { Huesped } from '../entities/huesped.entity';

interface HuespedBody {
  identificacion: string;
  nombre: string;
  apellido: string;
  telefono: string;
  tipoDocumento: string;
  fechaNacimiento: string;
}

export async function huespedRoutes(app: FastifyInstance) {
  const huespedRepository = AppDataSource.getRepository(Huesped);

  app.post<{ Body: HuespedBody }>(
    '/huesped',
    async (request, reply) => {
      try {
        const {
          identificacion,
          nombre,
          apellido,
          telefono,
          tipoDocumento,
          fechaNacimiento,
        } = request.body;

        const nuevoHuesped = huespedRepository.create({
          identificacion,
          nombre,
          apellido,
          telefono,
          tipoDocumento,
          fechaNacimiento: new Date(fechaNacimiento),
        });

        const huespedGuardado = await huespedRepository.save(nuevoHuesped);

        return reply.code(201).send(huespedGuardado);
      } catch (error) {
        return reply.code(500).send({
          message: 'Error al crear el huésped',
        });
      }
    },
  );
}