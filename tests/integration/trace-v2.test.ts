import { describe, expect, it, vi, beforeEach } from 'vitest';
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

import { traceIdHook } from '../../src/plugins/trace-id.plugin';
import { huespedV2Routes } from '../../src/routes/v2/huesped-v2.routes';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('x-trace-id y endpoints V2 de Hotel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('conserva el x-trace-id, lo devuelve y el listado V2 sigue respondiendo', async () => {
    repositorioMock.find.mockResolvedValue([
      { id: 1, nombre: 'Ana', apellido: 'Ruiz' },
    ]);

    const app = Fastify({ logger: false });
    app.addHook('onRequest', traceIdHook);
    await app.register(huespedV2Routes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/api/v2/huesped',
      headers: { 'x-trace-id': 'oci-otel-test-001' },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.headers['x-trace-id']).toBe('oci-otel-test-001');
    expect(respuesta.json()).toEqual([
      { id: 1, nombre: 'Ana', apellido: 'Ruiz' },
    ]);
    await app.close();
  });

  it('genera el x-trace-id de V2 cuando no llega', async () => {
    repositorioMock.find.mockResolvedValue([]);

    const app = Fastify({ logger: false });
    app.addHook('onRequest', traceIdHook);
    await app.register(huespedV2Routes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/api/v2/huesped',
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.headers['x-trace-id']).toMatch(UUID);
    await app.close();
  });

  it('no aplica x-trace-id fuera de V2', async () => {
    const app = Fastify({ logger: false });
    app.addHook('onRequest', traceIdHook);
    app.get('/huesped', async () => []);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/huesped',
      headers: { 'x-trace-id': 'no-debe-propagarse-aqui' },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.headers['x-trace-id']).toBeUndefined();
    await app.close();
  });
});
