import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';

const repositorioMock = {
  findOneBy: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
};

vi.mock('../../src/config/database', () => ({
  AppDataSource: {
    getRepository: vi.fn(() => repositorioMock),
    isInitialized: true,
    query: vi.fn(),
  },
  conTimeoutConsulta: <T>(operacion: Promise<T>) => operacion,
  conConsultaResiliente: <T>(factory: () => Promise<T>) => factory(),
  descripcionResilienciaDb: () => ({
    mode: 'protected',
    poolLimit: 10,
    queryTimeoutMs: 2000,
  }),
}));

import { traceIdHook } from '../../src/plugins/trace-id.plugin';
import {
  chaosControlRoutes,
  chaosDependencyHook,
  desactivarCaosTemporal,
} from '../../src/plugins/chaos-dependency.plugin';
import { habitacionV2Routes } from '../../src/routes/v2/habitacion-v2.routes';
import { healthRoutes } from '../../src/routes/health.routes';

const habitacion = {
  id: 1,
  numeroHabitacion: '101',
  precioHabitacion: 100,
  estadoHabitacion: 'DISPONIBLE',
  tipoHabitacion: 'SIMPLE',
};

async function crearApp() {
  const app = Fastify({ logger: false });
  app.addHook('onRequest', traceIdHook);
  app.addHook('onRequest', chaosDependencyHook);
  await app.register(healthRoutes);
  await app.register(habitacionV2Routes);
  await app.register(chaosControlRoutes);
  return app;
}

describe('Indisponibilidad controlada de Hotel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    desactivarCaosTemporal();
    delete process.env.CHAOS_DEPENDENCY_DOWN;
    process.env.CHAOS_LAB_TOKEN = 'lab-token-test';
    repositorioMock.findOneBy.mockResolvedValue(habitacion);
  });

  afterEach(() => {
    desactivarCaosTemporal();
    delete process.env.CHAOS_DEPENDENCY_DOWN;
    delete process.env.CHAOS_LAB_TOKEN;
  });

  it('sin caos responde 200', async () => {
    const app = await crearApp();
    const respuesta = await app.inject({
      method: 'GET',
      url: '/api/v2/habitacion/1',
      headers: { 'x-trace-id': 'ok-1' },
    });

    expect(respuesta.statusCode).toBe(200);
    await app.close();
  });

  it('env CHAOS_DEPENDENCY_DOWN inyecta 503 con traceId', async () => {
    process.env.CHAOS_DEPENDENCY_DOWN = 'true';
    const app = await crearApp();

    const respuesta = await app.inject({
      method: 'GET',
      url: '/api/v2/habitacion/1',
      headers: { 'x-trace-id': 'chaos-env-1' },
    });

    expect(respuesta.statusCode).toBe(503);
    expect(respuesta.headers['x-trace-id']).toBe('chaos-env-1');
    expect(respuesta.json()).toMatchObject({
      code: 'CHAOS_DEPENDENCY_DOWN',
      traceId: 'chaos-env-1',
    });
    expect(repositorioMock.findOneBy).not.toHaveBeenCalled();
    await app.close();
  });

  it('header sin token no activa caos', async () => {
    const app = await crearApp();
    const respuesta = await app.inject({
      method: 'GET',
      url: '/api/v2/habitacion/1',
      headers: {
        'x-trace-id': 'no-token',
        'x-chaos-dependency': 'down',
      },
    });

    expect(respuesta.statusCode).toBe(200);
    await app.close();
  });

  it('header con token de laboratorio inyecta 503', async () => {
    const app = await crearApp();
    const respuesta = await app.inject({
      method: 'GET',
      url: '/api/v2/habitacion/1',
      headers: {
        'x-trace-id': 'chaos-header-1',
        'x-chaos-dependency': 'down',
        'x-chaos-token': 'lab-token-test',
      },
    });

    expect(respuesta.statusCode).toBe(503);
    expect(respuesta.json().traceId).toBe('chaos-header-1');
    await app.close();
  });

  it('/live no se ve afectado por el caos', async () => {
    process.env.CHAOS_DEPENDENCY_DOWN = 'true';
    const app = await crearApp();
    const respuesta = await app.inject({ method: 'GET', url: '/live' });
    expect(respuesta.statusCode).toBe(200);
    await app.close();
  });

  it('API de control enable/disable con token', async () => {
    const app = await crearApp();

    const enable = await app.inject({
      method: 'POST',
      url: '/api/v2/chaos/dependency',
      headers: { 'x-chaos-token': 'lab-token-test' },
      payload: { action: 'enable', durationSeconds: 30 },
    });

    expect(enable.statusCode).toBe(200);
    expect(enable.json().chaos.activo).toBe(true);

    const down = await app.inject({
      method: 'GET',
      url: '/api/v2/habitacion/1',
      headers: { 'x-trace-id': 'after-enable' },
    });
    expect(down.statusCode).toBe(503);

    const disable = await app.inject({
      method: 'POST',
      url: '/api/v2/chaos/dependency',
      headers: { 'x-chaos-token': 'lab-token-test' },
      payload: { action: 'disable' },
    });
    expect(disable.statusCode).toBe(200);
    expect(disable.json().chaos.temporalActivo).toBe(false);

    const recovered = await app.inject({
      method: 'GET',
      url: '/api/v2/habitacion/1',
      headers: { 'x-trace-id': 'recovered' },
    });
    expect(recovered.statusCode).toBe(200);
    await app.close();
  });
});
