import { describe, expect, it, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

const queryMock = vi.fn();

vi.mock('../../src/config/database', () => ({
  AppDataSource: {
    get isInitialized() {
      return (globalThis as { __dbInit?: boolean }).__dbInit !== false;
    },
    query: (...args: unknown[]) => queryMock(...args),
    getRepository: vi.fn(),
  },
}));

import { healthRoutes } from '../../src/routes/health.routes';

describe('Health checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as { __dbInit?: boolean }).__dbInit = true;
  });

  it('GET /live responde 200 sin consultar MySQL', async () => {
    const app = Fastify({ logger: false });
    await app.register(healthRoutes);

    const respuesta = await app.inject({ method: 'GET', url: '/live' });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({
      status: 'alive',
      service: 'hotel-api',
    });
    expect(queryMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('GET /ready responde 200 cuando la DB responde', async () => {
    queryMock.mockResolvedValue([{ '1': 1 }]);

    const app = Fastify({ logger: false });
    await app.register(healthRoutes);

    const respuesta = await app.inject({ method: 'GET', url: '/ready' });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({
      status: 'ready',
      service: 'hotel-api',
    });
    expect(queryMock).toHaveBeenCalledWith('SELECT 1');
    await app.close();
  });

  it('GET /ready responde 503 cuando la DB falla', async () => {
    queryMock.mockRejectedValue(new Error('connection refused'));

    const app = Fastify({ logger: false });
    await app.register(healthRoutes);

    const respuesta = await app.inject({ method: 'GET', url: '/ready' });

    expect(respuesta.statusCode).toBe(503);
    expect(respuesta.json()).toMatchObject({
      status: 'not_ready',
      reason: 'database_unavailable',
    });
    await app.close();
  });

  it('GET /ready responde 503 si DataSource no esta inicializado', async () => {
    (globalThis as { __dbInit?: boolean }).__dbInit = false;

    const app = Fastify({ logger: false });
    await app.register(healthRoutes);

    const respuesta = await app.inject({ method: 'GET', url: '/ready' });

    expect(respuesta.statusCode).toBe(503);
    expect(respuesta.json()).toMatchObject({
      status: 'not_ready',
      reason: 'database_not_initialized',
    });
    expect(queryMock).not.toHaveBeenCalled();
    await app.close();
  });
});
