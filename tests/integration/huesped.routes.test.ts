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

import { huespedRoutes } from '../../src/routes/huesped.routes';

describe('Pruebas de integracion de huesped', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no debe crear un huésped si faltan datos', async () => {
    const app = Fastify();

    await app.register(huespedRoutes);

    const respuesta = await app.inject({
      method: 'POST',
      url: '/huesped',
      payload: {
        identificacion: '',
        nombre: 'Samuel',
        apellido: 'Giraldo',
        telefono: '3105556677',
        tipoDocumento: 'CC',
        fechaNacimiento: '2002-05-14',
      },
    });

    expect(respuesta.statusCode).toBe(400);

    await app.close();
  });

  it('debe crear un huesped correctamente', async () => {
    const app = Fastify();

    const huesped = {
      id: 1,
      identificacion: '1030123456',
      nombre: 'Samuel',
      apellido: 'Giraldo',
      telefono: '3105556677',
      tipoDocumento: 'CC',
      fechaNacimiento: new Date('2002-05-14'),
    };

    repositorioMock.create.mockReturnValue(huesped);
    repositorioMock.save.mockResolvedValue(huesped);

    await app.register(huespedRoutes);

    const respuesta = await app.inject({
      method: 'POST',
      url: '/huesped',
      payload: {
        identificacion: '1030123456',
        nombre: 'Samuel',
        apellido: 'Giraldo',
        telefono: '3105556677',
        tipoDocumento: 'CC',
        fechaNacimiento: '2002-05-14',
      },
    });

    expect(respuesta.statusCode).toBe(201);

    await app.close();
  });

  it('debe consultar todos los huespedes', async () => {
    const app = Fastify();

    repositorioMock.find.mockResolvedValue([
      {
        id: 1,
        nombre: 'Samuel',
      },
    ]);

    await app.register(huespedRoutes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/huesped',
    });

    expect(respuesta.statusCode).toBe(200);

    await app.close();
  });

  it('debe consultar un huesped por id', async () => {
    const app = Fastify();

    repositorioMock.findOneBy.mockResolvedValue({
      id: 1,
      nombre: 'Samuel',
    });

    await app.register(huespedRoutes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/huesped/1',
    });

    expect(respuesta.statusCode).toBe(200);

    await app.close();
  });

  it('debe devolver 404 si el huesped no existe', async () => {
    const app = Fastify();

    repositorioMock.findOneBy.mockResolvedValue(null);

    await app.register(huespedRoutes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/huesped/999',
    });

    expect(respuesta.statusCode).toBe(404);

    await app.close();
  });

  it('debe eliminar un huésped', async () => {
    const app = Fastify();

    const huesped = {
      id: 1,
      nombre: 'Samuel',
    };

    repositorioMock.findOneBy.mockResolvedValue(huesped);
    repositorioMock.remove.mockResolvedValue(huesped);

    await app.register(huespedRoutes);

    const respuesta = await app.inject({
      method: 'DELETE',
      url: '/huesped/1',
    });

    expect(respuesta.statusCode).toBe(200);

    await app.close();
  });

   it('debe actualizar un huesped correctamente', async () => {
    const app = Fastify();

    const huesped = {
      id: 1,
      identificacion: '1030123456',
      nombre: 'Samuel',
      apellido: 'Giraldo',
      telefono: '3105556677',
      tipoDocumento: 'CC',
      fechaNacimiento: new Date('2002-05-14'),
    };

    repositorioMock.findOneBy.mockResolvedValue(huesped);
    repositorioMock.save.mockResolvedValue(huesped);

    await app.register(huespedRoutes);

    const respuesta = await app.inject({
      method: 'PATCH',
      url: '/huesped/1',
      payload: {
        identificacion: '1030999999',
        nombre: 'Samuel David',
        apellido: 'Giraldo Roldan',
        telefono: '3001234567',
        tipoDocumento: 'CC',
        fechaNacimiento: '2002-05-15',
      },
    });

    expect(respuesta.statusCode).toBe(200);

    await app.close();
  });

});