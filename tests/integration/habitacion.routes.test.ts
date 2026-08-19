import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

const repositorioMock = {
  create: vi.fn(),
  save: vi.fn(),
  find: vi.fn(),
  findOneBy: vi.fn(),
  remove: vi.fn(),
};

vi.mock('../../src/config/database', () => ({
  AppDataSource: {
    getRepository: vi.fn(() => repositorioMock),
  },
}));

import { habitacionRoutes } from '../../src/routes/habitacion.routes';

describe('Pruebas de integracion de habitacion', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no debe crear una habitacion con datos invalidos', async () => {
    const app = Fastify();

    await app.register(habitacionRoutes);

    const respuesta = await app.inject({
      method: 'POST',
      url: '/habitacion',
      payload: {
        numeroHabitacion: '106',
        precioHabitacion: 0,
        estadoHabitacion: 'DISPONIBLE',
        tipoHabitacion: 'DOBLE',
      },
    });

    expect(respuesta.statusCode).toBe(400);

    await app.close();
  });

  it('debe crear una habitacion correctamente', async () => {
    const app = Fastify();

    const habitacion = {
      id: 1,
      numeroHabitacion: '106',
      precioHabitacion: 220000,
      estadoHabitacion: 'DISPONIBLE',
      tipoHabitacion: 'DOBLE',
    };

    repositorioMock.create.mockReturnValue(habitacion);
    repositorioMock.save.mockResolvedValue(habitacion);

    await app.register(habitacionRoutes);

    const respuesta = await app.inject({
      method: 'POST',
      url: '/habitacion',
      payload: {
        numeroHabitacion: '106',
        precioHabitacion: 220000,
        estadoHabitacion: 'DISPONIBLE',
        tipoHabitacion: 'DOBLE',
      },
    });

    expect(respuesta.statusCode).toBe(201);

    await app.close();
  });

  it('debe consultar todas las habitaciones', async () => {
    const app = Fastify();

    repositorioMock.find.mockResolvedValue([
      {
        id: 1,
        numeroHabitacion: '106',
        precioHabitacion: 220000,
        estadoHabitacion: 'DISPONIBLE',
        tipoHabitacion: 'DOBLE',
      },
    ]);

    await app.register(habitacionRoutes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/habitacion',
    });

    expect(respuesta.statusCode).toBe(200);

    await app.close();
  });

  it('debe devolver 500 si ocurre un error al consultar habitaciones', async () => {
    const app = Fastify();

    repositorioMock.find.mockRejectedValue(
      new Error('Error de base de datos'),
    );

    await app.register(habitacionRoutes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/habitacion',
    });

    expect(respuesta.statusCode).toBe(500);

    await app.close();
  });

  it('debe consultar una habitacion por id', async () => {
    const app = Fastify();

    repositorioMock.findOneBy.mockResolvedValue({
      id: 1,
      numeroHabitacion: '106',
    });

    await app.register(habitacionRoutes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/habitacion/1',
    });

    expect(respuesta.statusCode).toBe(200);

    await app.close();
  });

  it('debe devolver 404 si la habitacion no existe', async () => {
    const app = Fastify();

    repositorioMock.findOneBy.mockResolvedValue(null);

    await app.register(habitacionRoutes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/habitacion/999',
    });

    expect(respuesta.statusCode).toBe(404);

    await app.close();
  });

  it('debe eliminar una habitacion', async () => {
    const app = Fastify();

    const habitacion = {
      id: 1,
      numeroHabitacion: '106',
    };

    repositorioMock.findOneBy.mockResolvedValue(habitacion);
    repositorioMock.remove.mockResolvedValue(habitacion);

    await app.register(habitacionRoutes);

    const respuesta = await app.inject({
      method: 'DELETE',
      url: '/habitacion/1',
    });

    expect(respuesta.statusCode).toBe(200);

    await app.close();
  });

  it('debe devolver 404 al eliminar una habitacion que no existe', async () => {
    const app = Fastify();

    repositorioMock.findOneBy.mockResolvedValue(null);

    await app.register(habitacionRoutes);

    const respuesta = await app.inject({
      method: 'DELETE',
      url: '/habitacion/999',
    });

    expect(respuesta.statusCode).toBe(404);

    await app.close();
  });

  it('debe actualizar una habitacion correctamente', async () => {
    const app = Fastify();

    const habitacion = {
      id: 1,
      numeroHabitacion: '106',
      precioHabitacion: 220000,
      estadoHabitacion: 'DISPONIBLE',
      tipoHabitacion: 'DOBLE',
    };

    repositorioMock.findOneBy.mockResolvedValue(habitacion);
    repositorioMock.save.mockResolvedValue(habitacion);

    await app.register(habitacionRoutes);

    const respuesta = await app.inject({
      method: 'PATCH',
      url: '/habitacion/1',
      payload: {
        numeroHabitacion: '107',
        precioHabitacion: 250000,
        estadoHabitacion: 'OCUPADA',
        tipoHabitacion: 'SUITE',
      },
    });

    expect(respuesta.statusCode).toBe(200);

    await app.close();
  });

  it('debe devolver 404 al actualizar una habitacion que no existe', async () => {
    const app = Fastify();

    repositorioMock.findOneBy.mockResolvedValue(null);

    await app.register(habitacionRoutes);

    const respuesta = await app.inject({
      method: 'PATCH',
      url: '/habitacion/999',
      payload: {
        numeroHabitacion: '107',
      },
    });

    expect(respuesta.statusCode).toBe(404);

    await app.close();
  });

});