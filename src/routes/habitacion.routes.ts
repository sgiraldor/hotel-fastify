import { FastifyInstance } from 'fastify';
import { AppDataSource } from '../config/database';
import { Habitacion } from '../entities/habitacion.entity';

interface HabitacionBody {
  numeroHabitacion: string;
  precioHabitacion: number;
  estadoHabitacion: string;
  tipoHabitacion: string;
}

interface ActualizarHabitacionBody {
  numeroHabitacion?: string;
  precioHabitacion?: number;
  estadoHabitacion?: string;
  tipoHabitacion?: string;
}

export async function habitacionRoutes(app: FastifyInstance) {
  const habitacionRepository =
    AppDataSource.getRepository(Habitacion);

  app.post<{ Body: HabitacionBody }>(
    '/habitacion',
    async (request, reply) => {
      try {
        const {
          numeroHabitacion,
          precioHabitacion,
          estadoHabitacion,
          tipoHabitacion,
        } = request.body;

        const nuevaHabitacion = habitacionRepository.create({
          numeroHabitacion,
          precioHabitacion,
          estadoHabitacion,
          tipoHabitacion,
        });

        const habitacionGuardada =
          await habitacionRepository.save(nuevaHabitacion);

        return reply.code(201).send(habitacionGuardada);
      } catch (error) {
        console.error('ERROR AL CREAR HABITACION:', error);

        return reply.code(500).send({
          message: 'Error al crear la habitación',
        });
      }
    },
  );

  app.get('/habitacion', async (request, reply) => {
    try {
      const habitaciones = await habitacionRepository.find();

      return reply.code(200).send(habitaciones);
    } catch (error) {
      return reply.code(500).send({
        message: 'Error al consultar las habitaciones',
      });
    }
  });

  app.get<{ Params: { id: string } }>(
    '/habitacion/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const habitacion =
          await habitacionRepository.findOneBy({ id });

        if (!habitacion) {
          return reply.code(404).send({
            message: 'Habitación no encontrada',
          });
        }

        return reply.code(200).send(habitacion);
      } catch (error) {
        return reply.code(500).send({
          message: 'Error al consultar la habitación',
        });
      }
    },
  );

  app.patch<{
    Params: { id: string };
    Body: ActualizarHabitacionBody;
  }>(
    '/habitacion/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const habitacion =
          await habitacionRepository.findOneBy({ id });

        if (!habitacion) {
          return reply.code(404).send({
            message: 'Habitación no encontrada',
          });
        }

        const {
          numeroHabitacion,
          precioHabitacion,
          estadoHabitacion,
          tipoHabitacion,
        } = request.body;

        if (numeroHabitacion !== undefined) {
          habitacion.numeroHabitacion = numeroHabitacion;
        }

        if (precioHabitacion !== undefined) {
          habitacion.precioHabitacion = precioHabitacion;
        }

        if (estadoHabitacion !== undefined) {
          habitacion.estadoHabitacion = estadoHabitacion;
        }

        if (tipoHabitacion !== undefined) {
          habitacion.tipoHabitacion = tipoHabitacion;
        }

        const habitacionActualizada =
          await habitacionRepository.save(habitacion);

        return reply.code(200).send(habitacionActualizada);
      } catch (error) {
        return reply.code(500).send({
          message: 'Error al actualizar la habitación',
        });
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/habitacion/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const habitacion =
          await habitacionRepository.findOneBy({ id });

        if (!habitacion) {
          return reply.code(404).send({
            message: 'Habitación no encontrada',
          });
        }

        await habitacionRepository.remove(habitacion);

        return reply.code(200).send({
          message: 'Habitación eliminada correctamente',
        });
      } catch (error) {
        return reply.code(500).send({
          message: 'Error al eliminar la habitación',
        });
      }
    },
  );
}