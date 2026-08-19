import { FastifyInstance } from 'fastify';
import { AppDataSource } from '../config/database';
import { CheckIn } from '../entities/checkin.entity';
import { Huesped } from '../entities/huesped.entity';
import { Habitacion } from '../entities/habitacion.entity';
import { validarCheckIn } from '../utils/checkin.utils';

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
  const checkinRepository = AppDataSource.getRepository(CheckIn);
  const huespedRepository = AppDataSource.getRepository(Huesped);
  const habitacionRepository = AppDataSource.getRepository(Habitacion);

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

        if (!datosValidos){
          return reply.code(400).send({
            message: "los datos del chekin estan incompletos"
          });
        }

        const huesped = await huespedRepository.findOneBy({
          id: huespedId,
        });

        if (!huesped) {
          return reply.code(404).send({
            message: 'Huésped no encontrado',
          });
        }

        const habitacion = await habitacionRepository.findOneBy({
          id: habitacionId,
        });

        if (!habitacion) {
          return reply.code(404).send({
            message: 'Habitación no encontrada',
          });
        }

        const nuevoCheckIn = checkinRepository.create({
          huesped,
          habitacion,
          fechaIngreso: new Date(fechaIngreso),
          fechaSalida: new Date(fechaSalida),
          pagoTotalHabitacion,
          pagoRealizado,
          estadoPago,
        });

        const checkInGuardado =
          await checkinRepository.save(nuevoCheckIn);

        return reply.code(201).send(checkInGuardado);
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
      const checkins = await checkinRepository.find({
        relations: {
          huesped: true,
          habitacion: true,
        },
      });

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

        const checkin = await checkinRepository.findOne({
          where: { id },
          relations: {
            huesped: true,
            habitacion: true,
          },
        });

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

        const checkin = await checkinRepository.findOne({
          where: { id },
          relations: {
            huesped: true,
            habitacion: true,
          },
        });

        if (!checkin) {
          return reply.code(404).send({
            message: 'Check-in no encontrado',
          });
        }

        const {
          huespedId,
          habitacionId,
          fechaIngreso,
          fechaSalida,
          pagoTotalHabitacion,
          pagoRealizado,
          estadoPago,
        } = request.body;

        if (huespedId !== undefined) {
          const huesped = await huespedRepository.findOneBy({
            id: huespedId,
          });

          if (!huesped) {
            return reply.code(404).send({
              message: 'Huésped no encontrado',
            });
          }

          checkin.huesped = huesped;
        }

        if (habitacionId !== undefined) {
          const habitacion = await habitacionRepository.findOneBy({
            id: habitacionId,
          });

          if (!habitacion) {
            return reply.code(404).send({
              message: 'Habitación no encontrada',
            });
          }

          checkin.habitacion = habitacion;
        }

        if (fechaIngreso !== undefined) {
          checkin.fechaIngreso = new Date(fechaIngreso);
        }

        if (fechaSalida !== undefined) {
          checkin.fechaSalida = new Date(fechaSalida);
        }

        if (pagoTotalHabitacion !== undefined) {
          checkin.pagoTotalHabitacion = pagoTotalHabitacion;
        }

        if (pagoRealizado !== undefined) {
          checkin.pagoRealizado = pagoRealizado;
        }

        if (estadoPago !== undefined) {
          checkin.estadoPago = estadoPago;
        }

        const checkinActualizado =
          await checkinRepository.save(checkin);

        return reply.code(200).send(checkinActualizado);
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

        const checkin = await checkinRepository.findOneBy({ id });

        if (!checkin) {
          return reply.code(404).send({
            message: 'Check-in no encontrado',
          });
        }

        await checkinRepository.remove(checkin);

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