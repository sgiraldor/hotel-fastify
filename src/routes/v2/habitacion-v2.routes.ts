import { FastifyInstance } from 'fastify';
import {
  AppDataSource,
  conTimeoutConsulta,
} from '../../config/database';
import { Habitacion } from '../../entities/habitacion.entity';
import { validarHabitacion } from '../../utils/habitacion.utils';
import { traceIdDeLaPeticion } from '../../plugins/trace-id.plugin';

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

/**
 * Contrato V2 para Sports (coordinador E2E).
 * Endpoint principal de integracion: GET /api/v2/habitacion/:id
 */
export async function habitacionV2Routes(app: FastifyInstance) {
  const habitacionRepository = AppDataSource.getRepository(Habitacion);

  app.post<{ Body: HabitacionBody }>(
    '/api/v2/habitacion',
    async (request, reply) => {
      const traceId = traceIdDeLaPeticion(request);

      try {
        const datosValidos = validarHabitacion(request.body);

        if (!datosValidos) {
          return reply.code(400).send({
            message: 'los datos de la habitacion estan incompletos',
            traceId,
          });
        }

        const nuevaHabitacion = habitacionRepository.create({
          numeroHabitacion: request.body.numeroHabitacion,
          precioHabitacion: request.body.precioHabitacion,
          estadoHabitacion: request.body.estadoHabitacion,
          tipoHabitacion: request.body.tipoHabitacion,
        });

        const habitacionGuardada =
          await habitacionRepository.save(nuevaHabitacion);

        return reply.code(201).send(habitacionGuardada);
      } catch (error) {
        request.log.error({ error, traceId }, 'ERROR AL CREAR HABITACION V2');

        return reply.code(500).send({
          message: 'Error al crear la habitacion',
          traceId,
        });
      }
    },
  );

  app.get('/api/v2/habitacion', async (request, reply) => {
    const traceId = traceIdDeLaPeticion(request);

    try {
      const habitaciones = await habitacionRepository.find();
      return reply.code(200).send(habitaciones);
    } catch (error) {
      request.log.error({ error, traceId }, 'ERROR AL CONSULTAR HABITACIONES V2');

      return reply.code(500).send({
        message: 'Error al consultar las habitaciones',
        traceId,
      });
    }
  });

  app.get<{ Params: { id: string } }>(
    '/api/v2/habitacion/:id',
    async (request, reply) => {
      const traceId = traceIdDeLaPeticion(request);

      try {
        const id = Number(request.params.id);

        if (!Number.isFinite(id) || id <= 0) {
          return reply.code(400).send({
            message: 'id de habitacion invalido',
            traceId,
          });
        }

        const habitacion = await conTimeoutConsulta(
          habitacionRepository.findOneBy({ id }),
        );

        if (!habitacion) {
          return reply.code(404).send({
            message: 'Habitacion no encontrada',
            traceId,
          });
        }

        return reply.code(200).send(habitacion);
      } catch (error) {
        const mensaje =
          error instanceof Error ? error.message : 'Error desconocido';

        if (mensaje.startsWith('DB_QUERY_TIMEOUT_')) {
          request.log.warn(
            { error, traceId },
            'Fail-fast: timeout de consulta habitacion V2',
          );

          return reply.code(504).send({
            message: 'Timeout consultando habitacion (fail-fast)',
            code: 'DB_QUERY_TIMEOUT',
            traceId,
          });
        }

        request.log.error(
          { error, traceId },
          'ERROR AL CONSULTAR HABITACION V2',
        );

        return reply.code(500).send({
          message: 'Error al consultar la habitacion',
          traceId,
        });
      }
    },
  );

  app.patch<{
    Params: { id: string };
    Body: ActualizarHabitacionBody;
  }>('/api/v2/habitacion/:id', async (request, reply) => {
    const traceId = traceIdDeLaPeticion(request);

    try {
      const id = Number(request.params.id);
      const habitacion = await habitacionRepository.findOneBy({ id });

      if (!habitacion) {
        return reply.code(404).send({
          message: 'Habitacion no encontrada',
          traceId,
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
      request.log.error(
        { error, traceId },
        'ERROR AL ACTUALIZAR HABITACION V2',
      );

      return reply.code(500).send({
        message: 'Error al actualizar la habitacion',
        traceId,
      });
    }
  });

  app.delete<{ Params: { id: string } }>(
    '/api/v2/habitacion/:id',
    async (request, reply) => {
      const traceId = traceIdDeLaPeticion(request);

      try {
        const id = Number(request.params.id);
        const habitacion = await habitacionRepository.findOneBy({ id });

        if (!habitacion) {
          return reply.code(404).send({
            message: 'Habitacion no encontrada',
            traceId,
          });
        }

        await habitacionRepository.remove(habitacion);

        return reply.code(200).send({
          message: 'Habitacion eliminada correctamente',
          traceId,
        });
      } catch (error) {
        request.log.error(
          { error, traceId },
          'ERROR AL ELIMINAR HABITACION V2',
        );

        return reply.code(500).send({
          message: 'Error al eliminar la habitacion',
          traceId,
        });
      }
    },
  );
}
