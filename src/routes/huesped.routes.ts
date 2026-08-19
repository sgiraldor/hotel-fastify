import { FastifyInstance } from 'fastify';
import { AppDataSource } from '../config/database';
import { Huesped } from '../entities/huesped.entity';
import { validarHuesped } from '../utils/huesped.utils';

interface HuespedBody {
  identificacion: string;
  nombre: string;
  apellido: string;
  telefono: string;
  tipoDocumento: string;
  fechaNacimiento: string;
}

interface ActualizarHuespedBody {
  identificacion?: string;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  tipoDocumento?: string;
  fechaNacimiento?: string;
}

export async function huespedRoutes(app: FastifyInstance) {
  const huespedRepository = AppDataSource.getRepository(Huesped);

  // Crear un huésped
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

        const datosValidos = validarHuesped({
          identificacion,
          nombre,
          apellido,
          telefono,
          tipoDocumento,
          fechaNacimiento,
        });

        if (!datosValidos) {
          return reply.code(400).send({
            message: 'faltan datos del huesped',
          });
        }

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
        console.error(error);

        return reply.code(500).send({
          message: 'Error al crear el huésped',
        });
      }
    },
  );

  // Consultar todos los huéspedes
  app.get('/huesped', async (request, reply) => {
    try {
      const huespedes = await huespedRepository.find();

      return reply.code(200).send(huespedes);
    } catch (error) {
      console.error(error);

      return reply.code(500).send({
        message: 'Error al consultar los huéspedes',
      });
    }
  });

  // Consultar huésped por ID
  app.get<{ Params: { id: string } }>(
    '/huesped/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const huesped = await huespedRepository.findOneBy({ id });

        if (!huesped) {
          return reply.code(404).send({
            message: 'Huésped no encontrado',
          });
        }

        return reply.code(200).send(huesped);
      } catch (error) {
        console.error(error);

        return reply.code(500).send({
          message: 'Error al consultar el huésped',
        });
      }
    },
  );

  // Actualizar huésped
  app.patch<{
    Params: { id: string };
    Body: ActualizarHuespedBody;
  }>(
    '/huesped/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const huesped = await huespedRepository.findOneBy({ id });

        if (!huesped) {
          return reply.code(404).send({
            message: 'Huésped no encontrado',
          });
        }

        const {
          identificacion,
          nombre,
          apellido,
          telefono,
          tipoDocumento,
          fechaNacimiento,
        } = request.body;

        if (identificacion !== undefined) {
          huesped.identificacion = identificacion;
        }

        if (nombre !== undefined) {
          huesped.nombre = nombre;
        }

        if (apellido !== undefined) {
          huesped.apellido = apellido;
        }

        if (telefono !== undefined) {
          huesped.telefono = telefono;
        }

        if (tipoDocumento !== undefined) {
          huesped.tipoDocumento = tipoDocumento;
        }

        if (fechaNacimiento !== undefined) {
          huesped.fechaNacimiento = new Date(fechaNacimiento);
        }

        const huespedActualizado = await huespedRepository.save(huesped);

        return reply.code(200).send(huespedActualizado);
      } catch (error) {
        console.error(error);

        return reply.code(500).send({
          message: 'Error al actualizar el huésped',
        });
      }
    },
  );

  // Eliminar huésped
  app.delete<{ Params: { id: string } }>(
    '/huesped/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const huesped = await huespedRepository.findOneBy({ id });

        if (!huesped) {
          return reply.code(404).send({
            message: 'Huésped no encontrado',
          });
        }

        await huespedRepository.remove(huesped);

        return reply.code(200).send({
          message: 'Huésped eliminado correctamente',
        });
      } catch (error) {
        console.error(error);

        return reply.code(500).send({
          message: 'Error al eliminar el huésped',
        });
      }
    },
  );
}