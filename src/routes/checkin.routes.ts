import { FastifyInstance } from 'fastify';
import { validarCheckIn } from '../utils/checkin.utils';
import { CheckInService } from '../services/checkin.service';

interface CheckInBody {
  huespedId: number;
  habitacionId: number;
  fechaIngreso: string;
  fechaSalida: string;
  pagoTotalHabitacion: number;
  pagoRealizado: number;
  estadoPago: string;
}

interface ActualizarCheckInBody {
  huespedId?: number;
  habitacionId?: number;
  fechaIngreso?: string;
  fechaSalida?: string;
  pagoTotalHabitacion?: number;
  pagoRealizado?: number;
  estadoPago?: string;
}

export async function checkinRoutes(app: FastifyInstance) {
  const checkinService = new CheckInService();

  app.post<{ Body: CheckInBody }>(
    '/checkin',
    async (request, reply) => {
      try {
        const {
          huespedId,
          habitacionId,
          fechaIngreso,
          fechaSalida,
          pagoTotalHabitacion,
          pagoRealizado,
          estadoPago,
        } = request.body;

        const datosValidos = validarCheckIn({
          huespedId,
          habitacionId,
          fechaIngreso,
          fechaSalida,
          pagoTotalHabitacion,
          pagoRealizado,
          estadoPago,
        });

        if (!datosValidos) {
          return reply.code(400).send({
            message: 'los datos del chekin estan incompletos',
          });
        }

        const resultado = await checkinService.crear({
          huespedId,
          habitacionId,
          fechaIngreso,
          fechaSalida,
          pagoTotalHabitacion,
          pagoRealizado,
          estadoPago,
        });

        if ('error' in resultado) {
          if (resultado.error === 'HUESPED_NO_ENCONTRADO') {
            return reply.code(404).send({
              message: 'Huésped no encontrado',
            });
          }

          if (resultado.error === 'HABITACION_NO_ENCONTRADA') {
            return reply.code(404).send({
              message: 'Habitación no encontrada',
            });
          }
        }

        return reply.code(201).send(resultado.checkin);
      } catch (error) {
        console.error('ERROR AL CREAR CHECKIN:', error);

        return reply.code(500).send({
          message: 'Error al crear el check-in',
        });
      }
    },
  );

  app.get('/checkin', async (request, reply) => {
    try {
      const checkins = await checkinService.obtenerTodos();

      return reply.code(200).send(checkins);
    } catch (error) {
      console.error('ERROR AL CONSULTAR CHECKINS:', error);

      return reply.code(500).send({
        message: 'Error al consultar los check-ins',
      });
    }
  });

  app.get<{ Params: { id: string } }>(
    '/checkin/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const checkin = await checkinService.obtenerPorId(id);

        if (!checkin) {
          return reply.code(404).send({
            message: 'Check-in no encontrado',
          });
        }

        return reply.code(200).send(checkin);
      } catch (error) {
        console.error('ERROR AL CONSULTAR CHECKIN:', error);

        return reply.code(500).send({
          message: 'Error al consultar el check-in',
        });
      }
    },
  );

  app.patch<{
    Params: { id: string };
    Body: ActualizarCheckInBody;
  }>(
    '/checkin/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const resultado = await checkinService.actualizar(
          id,
          request.body,
        );

        if ('error' in resultado) {
          if (resultado.error === 'CHECKIN_NO_ENCONTRADO') {
            return reply.code(404).send({
              message: 'Check-in no encontrado',
            });
          }

          if (resultado.error === 'HUESPED_NO_ENCONTRADO') {
            return reply.code(404).send({
              message: 'Huésped no encontrado',
            });
          }

          if (resultado.error === 'HABITACION_NO_ENCONTRADA') {
            return reply.code(404).send({
              message: 'Habitación no encontrada',
            });
          }
        }

        return reply.code(200).send(resultado.checkin);
      } catch (error) {
        console.error('ERROR AL ACTUALIZAR CHECKIN:', error);

        return reply.code(500).send({
          message: 'Error al actualizar el check-in',
        });
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/checkin/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const eliminado = await checkinService.eliminar(id);

        if (!eliminado) {
          return reply.code(404).send({
            message: 'Check-in no encontrado',
          });
        }

        return reply.code(200).send({
          message: 'Check-in eliminado correctamente',
        });
      } catch (error) {
        console.error('ERROR AL ELIMINAR CHECKIN:', error);

        return reply.code(500).send({
          message: 'Error al eliminar el check-in',
        });
      }
    },
  );
}