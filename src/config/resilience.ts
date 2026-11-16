/**
 * Patrones de resiliencia demostrables en Hotel (callee):
 * 1) Fail-fast: timeouts de request y de query.
 * 2) Bulkhead: limite de conexiones del pool MySQL.
 *
 * RESILIENCE_MODE=protected (Ronda 1) | unprotected (Ronda 0)
 */

export type ResilienceMode = 'protected' | 'unprotected';

export function obtenerModoResiliencia(): ResilienceMode {
  const modo = process.env.RESILIENCE_MODE?.trim().toLowerCase();

  if (modo === 'unprotected') {
    return 'unprotected';
  }

  return 'protected';
}

export function obtenerLimitePool(): number {
  if (obtenerModoResiliencia() === 'unprotected') {
    return Number(process.env.DB_POOL_LIMIT_UNPROTECTED || 50);
  }

  return Number(process.env.DB_POOL_LIMIT || 10);
}

export function obtenerQueryTimeoutMs(): number {
  if (obtenerModoResiliencia() === 'unprotected') {
    return Number(process.env.DB_QUERY_TIMEOUT_MS_UNPROTECTED || 30000);
  }

  return Number(process.env.DB_QUERY_TIMEOUT_MS || 2000);
}

export function obtenerRequestTimeoutMs(): number {
  if (obtenerModoResiliencia() === 'unprotected') {
    return Number(process.env.REQUEST_TIMEOUT_MS_UNPROTECTED || 0);
  }

  return Number(process.env.REQUEST_TIMEOUT_MS || 3000);
}

export async function conTimeoutConsulta<T>(
  operacion: Promise<T>,
  timeoutMs = obtenerQueryTimeoutMs(),
): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) {
    return operacion;
  }

  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operacion,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`DB_QUERY_TIMEOUT_${timeoutMs}MS`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
