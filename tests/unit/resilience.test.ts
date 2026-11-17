import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  conTimeoutConsulta,
  conConsultaResiliente,
  obtenerLimitePool,
  obtenerModoResiliencia,
  obtenerQueryTimeoutMs,
  obtenerRequestTimeoutMs,
  obtenerQueueLimit,
  obtenerLimiteConcurrencia,
  obtenerEstadisticasResiliencia,
} from '../../src/config/resilience';

const claves = [
  'RESILIENCE_MODE',
  'DB_POOL_LIMIT',
  'DB_POOL_LIMIT_UNPROTECTED',
  'DB_QUERY_TIMEOUT_MS',
  'DB_QUERY_TIMEOUT_MS_UNPROTECTED',
  'REQUEST_TIMEOUT_MS',
  'REQUEST_TIMEOUT_MS_UNPROTECTED',
  'DB_QUEUE_LIMIT',
  'DB_QUEUE_LIMIT_UNPROTECTED',
  'DB_CONCURRENCY_LIMIT',
  'DB_CONCURRENCY_LIMIT_UNPROTECTED',
];

describe('Patrones de resiliencia Hotel', () => {
  const backup: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const clave of claves) {
      backup[clave] = process.env[clave];
      delete process.env[clave];
    }
  });

  afterEach(() => {
    for (const clave of claves) {
      if (backup[clave] === undefined) {
        delete process.env[clave];
      } else {
        process.env[clave] = backup[clave];
      }
    }
  });

  it('modo protected aplica timeouts cortos, pool y cola limitados', () => {
    process.env.RESILIENCE_MODE = 'protected';
    expect(obtenerModoResiliencia()).toBe('protected');
    expect(obtenerLimitePool()).toBe(10);
    expect(obtenerQueryTimeoutMs()).toBe(2000);
    expect(obtenerRequestTimeoutMs()).toBe(3000);
    expect(obtenerQueueLimit()).toBe(10);
    expect(obtenerLimiteConcurrencia()).toBe(10);
  });

  it('modo unprotected relaja limites (Ronda 0)', () => {
    process.env.RESILIENCE_MODE = 'unprotected';
    expect(obtenerModoResiliencia()).toBe('unprotected');
    expect(obtenerLimitePool()).toBe(50);
    expect(obtenerQueryTimeoutMs()).toBe(30000);
    expect(obtenerRequestTimeoutMs()).toBe(0);
    expect(obtenerQueueLimit()).toBe(0);
    expect(obtenerLimiteConcurrencia()).toBe(50);
  });

  it('fail-fast: conTimeoutConsulta rechaza si excede el tiempo', async () => {
    process.env.RESILIENCE_MODE = 'protected';
    process.env.DB_QUERY_TIMEOUT_MS = '50';

    const lenta = new Promise((resolve) => {
      setTimeout(() => resolve('tarde'), 200);
    });

    await expect(conTimeoutConsulta(lenta, 50)).rejects.toThrow(
      /DB_QUERY_TIMEOUT_50MS/,
    );

    expect(obtenerEstadisticasResiliencia().timeoutsFailFast).toBeGreaterThan(
      0,
    );
  });

  it('fail-fast: conTimeoutConsulta resuelve dentro del tiempo', async () => {
    const rapida = Promise.resolve('ok');
    await expect(conTimeoutConsulta(rapida, 200)).resolves.toBe('ok');
  });

  it('bulkhead: rechaza cuando se excede la concurrencia', async () => {
    process.env.RESILIENCE_MODE = 'protected';
    process.env.DB_CONCURRENCY_LIMIT = '1';
    process.env.DB_QUERY_TIMEOUT_MS = '500';

    let liberar!: () => void;
    const bloqueo = new Promise<string>((resolve) => {
      liberar = () => resolve('hecho');
    });

    const primera = conConsultaResiliente(() => bloqueo);
    await new Promise((r) => setTimeout(r, 10));

    await expect(
      conConsultaResiliente(() => Promise.resolve('segunda')),
    ).rejects.toThrow(/DB_BULKHEAD_REJECTED_1/);

    liberar();
    await expect(primera).resolves.toBe('hecho');
    expect(
      obtenerEstadisticasResiliencia().bulkheadRejections,
    ).toBeGreaterThan(0);
  });
});
