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
  conTimeoutConsulta: <T>(operacion: Promise<T>) => operacion,
  conConsultaResiliente: <T>(factory: () => Promise<T>) => factory(),
}));

import { traceIdHook } from '../../src/plugins/trace-id.plugin';
import { habitacionV2Routes } from '../../src/routes/v2/habitacion-v2.routes';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const habitacionEjemplo = {
  id: 1,
  numeroHabitacion: '101',
  precioHabitacion: 120000,
  estadoHabitacion: 'DISPONIBLE',
  tipoHabitacion: 'SIMPLE',
};

describe('Contrato GET /api/v2/habitacion/:id y x-trace-id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve la habitacion y propaga x-trace-id recibido', async () => {
    repositorioMock.findOneBy.mockResolvedValue(habitacionEjemplo);

    const app = Fastify({ logger: false });
    app.addHook('onRequest', traceIdHook);
    await app.register(habitacionV2Routes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/api/v2/habitacion/1',
      headers: { 'x-trace-id': 'sports-e2e-trace-001' },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.headers['x-trace-id']).toBe('sports-e2e-trace-001');
    expect(respuesta.json()).toEqual(habitacionEjemplo);
    await app.close();
  });

  it('genera x-trace-id cuando Sports no lo envia', async () => {
    repositorioMock.findOneBy.mockResolvedValue(habitacionEjemplo);

    const app = Fastify({ logger: false });
    app.addHook('onRequest', traceIdHook);
    await app.register(habitacionV2Routes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/api/v2/habitacion/1',
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.headers['x-trace-id']).toMatch(UUID);
    await app.close();
  });

  it('responde 404 con traceId cuando no existe', async () => {
    repositorioMock.findOneBy.mockResolvedValue(null);

    const app = Fastify({ logger: false });
    app.addHook('onRequest', traceIdHook);
    await app.register(habitacionV2Routes);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/api/v2/habitacion/999',
      headers: { 'x-trace-id': 'sports-e2e-missing' },
    });

    expect(respuesta.statusCode).toBe(404);
    expect(respuesta.headers['x-trace-id']).toBe('sports-e2e-missing');
    expect(respuesta.json()).toEqual({
      message: 'Habitacion no encontrada',
      traceId: 'sports-e2e-missing',
    });
    await app.close();
  });

  it('no fuerza x-trace-id en rutas legacy', async () => {
    const app = Fastify({ logger: false });
    app.addHook('onRequest', traceIdHook);
    app.get('/habitacion/:id', async () => habitacionEjemplo);

    const respuesta = await app.inject({
      method: 'GET',
      url: '/habitacion/1',
      headers: { 'x-trace-id': 'legacy-no-aplica' },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.headers['x-trace-id']).toBeUndefined();
    await app.close();
  });
});
