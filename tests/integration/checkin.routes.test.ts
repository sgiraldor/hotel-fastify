import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

const checkinRepositoryMock = {
  create: vi.fn(),
  save: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  findOneBy: vi.fn(),
  remove: vi.fn(),
};

const huespedRepositoryMock = {
  findOneBy: vi.fn(),
};

const habitacionRepositoryMock = {
  findOneBy: vi.fn(),
};

vi.mock('../../src/config/database', () => ({
  AppDataSource: {
    getRepository: vi.fn((entidad) => {
      if (entidad.name === 'CheckIn') {
        return checkinRepositoryMock;
      }

      if (entidad.name === 'Huesped') {
        return huespedRepositoryMock;
      }

      return habitacionRepositoryMock;
    }),
  },
}));

import { checkinRoutes } from '../../src/routes/checkin.routes';

describe('Pruebas de integración de checkin', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no debe crear un check-in con datos invalidos', async () => {
    const app = Fastify();

    await app.register(checkinRoutes);

    const respuesta = await app.inject({
      method: 'POST',
      url: '/checkin',
      payload: {
        huespedId: 1,
        habitacionId: 1,
        fechaIngreso: '2026-08-25',
        fechaSalida: '2026-08-20',
        pagoTotalHabitacion: 440000,
        pagoRealizado: 220000,
        estadoPago: 'PENDIENTE',
      },
    });

    expect(respuesta.statusCode).toBe(400);

    await app.close();
  });

  it('debe crear un checkin correctamente', async () => {
    const app = Fastify();

    const huesped = {
      id: 1,
      nombre: 'Samuel',
    };

    const habitacion = {
      id: 1,
      numeroHabitacion: '105',
    };

    const checkin = {
      id: 1,
      huesped,
      habitacion,
      fechaIngreso: new Date('2026-08-20'),
      fechaSalida: new Date('2026-08-22'),
      pagoTotalHabitacion: 440000,
      pagoRealizado: 220000,
      estadoPago: 'PENDIENTE',
    };

    huespedRepositoryMock.findOneBy.mockResolvedValue(huesped);
    habitacionRepositoryMock.findOneBy.mockResolvedValue(habitacion);
    checkinRepositoryMock.create.mockReturnValue(checkin);
    checkinRepositoryMock.save.mockResolvedValue(checkin);

    await app.register(checkinRoutes);

    const respuesta = await app.inject({
      method: 'POST',
      url: '/checkin',
      payload: {
        huespedId: 1,
        habitacionId: 1,
        fechaIngreso: '2026-08-20',
        fechaSalida: '2026-08-22',
        pagoTotalHabitacion: 440000,
        pagoRealizado: 220000,
        estadoPago: 'PENDIENTE',
      },
    });

    expect(respuesta.statusCode).toBe(201);

    await app.close();
  });

  it('debe consultar todos los checkins', async () => {
    const app = Fastify();

    checkinRepositoryMock.find.mockResolvedValue([
      {
        id: 1,
        estadoPago: 'PENDIENTE',
      },
    ]);

    await app.register(checkinRoutes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/checkin',
    });

    expect(respuesta.statusCode).toBe(200);

    await app.close();
  });

  it('debe consultar un check-in por id', async () => {
    const app = Fastify();

    checkinRepositoryMock.findOne.mockResolvedValue({
      id: 1,
      estadoPago: 'PENDIENTE',
    });

    await app.register(checkinRoutes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/checkin/1',
    });

    expect(respuesta.statusCode).toBe(200);

    await app.close();
  });

     it('debe devolver 404 si el checkin no existe', async () => {
    const app = Fastify();

    checkinRepositoryMock.findOne.mockResolvedValue(null);

    await app.register(checkinRoutes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/checkin/999',
    });

    expect(respuesta.statusCode).toBe(404);

    await app.close();
  });

    it('debe eliminar un checkin', async () => {
    const app = Fastify();

    const checkin = {
      id: 1,
      estadoPago: 'PENDIENTE',
    };

    checkinRepositoryMock.findOneBy.mockResolvedValue(checkin);
    checkinRepositoryMock.remove.mockResolvedValue(checkin);

    await app.register(checkinRoutes);

    const respuesta = await app.inject({
      method: 'DELETE',
      url: '/checkin/1',
    });

    expect(respuesta.statusCode).toBe(200);

    await app.close();
  });

    it('debe actualizar un checkin correctamente', async () => {
    const app = Fastify();

    const huespedActual = {
      id: 1,
      nombre: 'Samuel',
    };

    const habitacionActual = {
      id: 1,
      numeroHabitacion: '106',
    };

    const nuevoHuesped = {
      id: 2,
      nombre: 'Daniel',
    };

    const nuevaHabitacion = {
      id: 2,
      numeroHabitacion: '107',
    };

    const checkin = {
      id: 1,
      huesped: huespedActual,
      habitacion: habitacionActual,
      fechaIngreso: new Date('2026-08-20'),
      fechaSalida: new Date('2026-08-22'),
      pagoTotalHabitacion: 440000,
      pagoRealizado: 220000,
      estadoPago: 'PENDIENTE',
    };

    checkinRepositoryMock.findOne.mockResolvedValue(checkin);

    huespedRepositoryMock.findOneBy.mockResolvedValue(nuevoHuesped);

    habitacionRepositoryMock.findOneBy.mockResolvedValue(
      nuevaHabitacion,
    );

    checkinRepositoryMock.save.mockResolvedValue(checkin);

    await app.register(checkinRoutes);

    const respuesta = await app.inject({
      method: 'PATCH',
      url: '/checkin/1',
      payload: {
        huespedId: 2,
        habitacionId: 2,
        fechaIngreso: '2026-08-21',
        fechaSalida: '2026-08-24',
        pagoTotalHabitacion: 660000,
        pagoRealizado: 660000,
        estadoPago: 'PAGADO',
      },
    });

    expect(respuesta.statusCode).toBe(200);

    await app.close();
  });

    it('no crear un checkin si el huesped no existe', async () => {
    const app = Fastify();

    huespedRepositoryMock.findOneBy.mockResolvedValue(null);

    await app.register(checkinRoutes);

    const respuesta = await app.inject({
      method: 'POST',
      url: '/checkin',
      payload: {
        huespedId: 999,
        habitacionId: 1,
        fechaIngreso: '2026-08-20',
        fechaSalida: '2026-08-22',
        pagoTotalHabitacion: 440000,
        pagoRealizado: 220000,
        estadoPago: 'PENDIENTE',
      },
    });

    expect(respuesta.statusCode).toBe(404);

    await app.close();
  });

});