import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  conTimeoutConsulta,
  obtenerLimitePool,
  obtenerModoResiliencia,
  obtenerQueryTimeoutMs,
  obtenerRequestTimeoutMs,
} from '../../src/config/resilience';

const claves = [
  'RESILIENCE_MODE',
  'DB_POOL_LIMIT',
  'DB_POOL_LIMIT_UNPROTECTED',
  'DB_QUERY_TIMEOUT_MS',
  'DB_QUERY_TIMEOUT_MS_UNPROTECTED',
  'REQUEST_TIMEOUT_MS',
  'REQUEST_TIMEOUT_MS_UNPROTECTED',
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

  it('modo protected aplica timeouts cortos y pool limitado', () => {
    process.env.RESILIENCE_MODE = 'protected';
    expect(obtenerModoResiliencia()).toBe('protected');
    expect(obtenerLimitePool()).toBe(10);
    expect(obtenerQueryTimeoutMs()).toBe(2000);
    expect(obtenerRequestTimeoutMs()).toBe(3000);
  });

  it('modo unprotected relaja limites (Ronda 0)', () => {
    process.env.RESILIENCE_MODE = 'unprotected';
    expect(obtenerModoResiliencia()).toBe('unprotected');
    expect(obtenerLimitePool()).toBe(50);
    expect(obtenerQueryTimeoutMs()).toBe(30000);
    expect(obtenerRequestTimeoutMs()).toBe(0);
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
  });

  it('fail-fast: conTimeoutConsulta resuelve dentro del tiempo', async () => {
    const rapida = Promise.resolve('ok');
    await expect(conTimeoutConsulta(rapida, 200)).resolves.toBe('ok');
  });
});
