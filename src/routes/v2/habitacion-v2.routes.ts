import { FastifyInstance } from 'fastify';
import { validarHabitacion } from '../../utils/habitacion.utils';
import { HabitacionService } from '../../services/habitacion.service';

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

export async function habitacionV2Routes(app: FastifyInstance) {
  const habitacionService = new HabitacionService();

  // Crear habitación V2
  app.post<{ Body: HabitacionBody }>(
    '/api/v2/habitacion',
    async (request, reply) => {
      try {
        const datosValidos = validarHabitacion(request.body);

        if (!datosValidos) {
          return reply.code(400).send({
            message: 'los datos de la habitacion estan incompletos',
          });
        }

        const habitacionGuardada =
          await habitacionService.crear(request.body);

        return reply.code(201).send(habitacionGuardada);
      } catch (error) {
        console.error('ERROR AL CREAR HABITACION V2:', error);

        return reply.code(500).send({
          message: 'Error al crear la habitación',
        });
      }
    },
  );

  // Consultar todas las habitaciones V2
  app.get('/api/v2/habitacion', async (request, reply) => {
    try {
      const habitaciones = await habitacionService.obtenerTodos();

      return reply.code(200).send(habitaciones);
    } catch (error) {
      console.error('ERROR AL CONSULTAR HABITACIONES V2:', error);

      return reply.code(500).send({
        message: 'Error al consultar las habitaciones',
      });
    }
  });

  // Consultar habitación por ID V2
  app.get<{ Params: { id: string } }>(
    '/api/v2/habitacion/:id',
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
        console.error('ERROR AL CONSULTAR HABITACION V2:', error);

        return reply.code(500).send({
          message: 'Error al consultar la habitación',
        });
      }
    },
  );

  // Actualizar habitación V2
  app.patch<{
    Params: { id: string };
    Body: ActualizarHabitacionBody;
  }>(
    '/api/v2/habitacion/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const habitacionActualizada =
          await habitacionService.actualizar(id, request.body);

        if (!habitacionActualizada) {
          return reply.code(404).send({
            message: 'Habitación no encontrada',
          });
        }

        return reply.code(200).send(habitacionActualizada);
      } catch (error) {
        console.error('ERROR AL ACTUALIZAR HABITACION V2:', error);

        return reply.code(500).send({
          message: 'Error al actualizar la habitación',
        });
      }
    },
  );

  // Eliminar habitación V2
  app.delete<{ Params: { id: string } }>(
    '/api/v2/habitacion/:id',
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
        console.error('ERROR AL ELIMINAR HABITACION V2:', error);

        return reply.code(500).send({
          message: 'Error al eliminar la habitación',
        });
      }
    },
  );
}