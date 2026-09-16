import { FastifyInstance } from 'fastify';
import { validarHuesped } from '../../utils/huesped.utils';
import { HuespedService } from '../../services/huesped.service';

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

export async function huespedV2Routes(app: FastifyInstance) {
  const huespedService = new HuespedService();

  // Crear huésped V2
  app.post<{ Body: HuespedBody }>(
    '/api/v2/huesped',
    async (request, reply) => {
      try {
        const datosValidos = validarHuesped(request.body);

        if (!datosValidos) {
          return reply.code(400).send({
            message: 'faltan datos del huesped',
          });
        }

        const huespedGuardado = await huespedService.crear(request.body);

        return reply.code(201).send(huespedGuardado);
      } catch (error) {
        console.error('ERROR AL CREAR HUESPED V2:', error);

        return reply.code(500).send({
          message: 'Error al crear el huésped',
        });
      }
    },
  );

  // Consultar todos los huéspedes V2
  app.get('/api/v2/huesped', async (request, reply) => {
    try {
      const huespedes = await huespedService.obtenerTodos();

      return reply.code(200).send(huespedes);
    } catch (error) {
      console.error('ERROR AL CONSULTAR HUESPEDES V2:', error);

      return reply.code(500).send({
        message: 'Error al consultar los huéspedes',
      });
    }
  });

  // Consultar huésped por ID V2
  app.get<{ Params: { id: string } }>(
    '/api/v2/huesped/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const huesped = await huespedService.obtenerPorId(id);

        if (!huesped) {
          return reply.code(404).send({
            message: 'Huésped no encontrado',
          });
        }

        return reply.code(200).send(huesped);
      } catch (error) {
        console.error('ERROR AL CONSULTAR HUESPED V2:', error);

        return reply.code(500).send({
          message: 'Error al consultar el huésped',
        });
      }
    },
  );

  // Actualizar huésped V2
  app.patch<{
    Params: { id: string };
    Body: ActualizarHuespedBody;
  }>(
    '/api/v2/huesped/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const huespedActualizado = await huespedService.actualizar(
          id,
          request.body,
        );

        if (!huespedActualizado) {
          return reply.code(404).send({
            message: 'Huésped no encontrado',
          });
        }

        return reply.code(200).send(huespedActualizado);
      } catch (error) {
        console.error('ERROR AL ACTUALIZAR HUESPED V2:', error);

        return reply.code(500).send({
          message: 'Error al actualizar el huésped',
        });
      }
    },
  );

  // Eliminar huésped V2
  app.delete<{ Params: { id: string } }>(
    '/api/v2/huesped/:id',
    async (request, reply) => {
      try {
        const id = Number(request.params.id);

        const eliminado = await huespedService.eliminar(id);

        if (!eliminado) {
          return reply.code(404).send({
            message: 'Huésped no encontrado',
          });
        }

        return reply.code(200).send({
          message: 'Huésped eliminado correctamente',
        });
      } catch (error) {
        console.error('ERROR AL ELIMINAR HUESPED V2:', error);

        return reply.code(500).send({
          message: 'Error al eliminar el huésped',
        });
      }
    },
  );
}