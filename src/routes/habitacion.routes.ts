import { FastifyInstance } from 'fastify';
import { validarHabitacion } from '../utils/habitacion.utils';
import { HabitacionService } from '../services/habitacion.service';

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
  const habitacionService = new HabitacionService();

  // Crear una habitación
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

        const datosValidos = validarHabitacion({
          numeroHabitacion,
          precioHabitacion,
          estadoHabitacion,
          tipoHabitacion,
        });

        if (!datosValidos) {
          return reply.code(400).send({
            message: 'los datos de la habitacion estan ioncompletos',
          });
        }

        const habitacionGuardada = await habitacionService.crear({
          numeroHabitacion,
          precioHabitacion,
          estadoHabitacion,
          tipoHabitacion,
        });

        return reply.code(201).send(habitacionGuardada);
      } catch (error) {
        console.error('ERROR AL CREAR HABITACION:', error);

        return reply.code(500).send({
          message: 'Error al crear la habitación',
        });
      }
    },
  );

  // Consultar todas las habitaciones
  app.get('/habitacion', async (request, reply) => {
    try {
      const habitaciones = await habitacionService.obtenerTodos();

      return reply.code(200).send(habitaciones);
    } catch (error) {
      return reply.code(500).send({
        message: 'Error al consultar las habitaciones',
      });
    }
  });

  // Consultar habitación por ID
  app.get<{ Params: { id: string } }>(
    '/habitacion/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const habitacion = await habitacionService.obtenerPorId(id);

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

  // Actualizar habitación
  app.patch<{
    Params: { id: string };
    Body: ActualizarHabitacionBody;
  }>(
    '/habitacion/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const habitacionActualizada = await habitacionService.actualizar(
          id,
          request.body,
        );

        if (!habitacionActualizada) {
          return reply.code(404).send({
            message: 'Habitación no encontrada',
          });
        }

        return reply.code(200).send(habitacionActualizada);
      } catch (error) {
        return reply.code(500).send({
          message: 'Error al actualizar la habitación',
        });
      }
    },
  );

  // Eliminar habitación
  app.delete<{ Params: { id: string } }>(
    '/habitacion/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const eliminada = await habitacionService.eliminar(id);

        if (!eliminada) {
          return reply.code(404).send({
            message: 'Habitación no encontrada',
          });
        }

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