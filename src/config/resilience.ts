/**
 * Patrones de resiliencia demostrables en Hotel (callee):
 * 1) Fail-fast: timeouts de request y de query.
 * 2) Bulkhead: limite de conexiones del pool MySQL + rechazo de exceso en vuelo.
 *
 * RESILIENCE_MODE=protected (Ronda 1) | unprotected (Ronda 0)
 */

export type ResilienceMode = 'protected' | 'unprotected';

let consultasEnVuelo = 0;
let timeoutsFailFast = 0;
let rechazosBulkhead = 0;
let consultasCompletadas = 0;

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

/** Cola máxima esperando conexión del pool (0 = ilimitada, típico unprotected). */
export function obtenerQueueLimit(): number {
  if (obtenerModoResiliencia() === 'unprotected') {
    return Number(process.env.DB_QUEUE_LIMIT_UNPROTECTED || 0);
  }

  return Number(process.env.DB_QUEUE_LIMIT || obtenerLimitePool());
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

/** Tope de consultas DB concurrentes (control de concurrencia / bulkhead lógico). */
export function obtenerLimiteConcurrencia(): number {
  if (obtenerModoResiliencia() === 'unprotected') {
    return Number(
      process.env.DB_CONCURRENCY_LIMIT_UNPROTECTED || obtenerLimitePool(),
    );
  }

  return Number(process.env.DB_CONCURRENCY_LIMIT || obtenerLimitePool());
}

export function obtenerEstadisticasResiliencia() {
  return {
    mode: obtenerModoResiliencia(),
    poolLimit: obtenerLimitePool(),
    queueLimit: obtenerQueueLimit(),
    concurrencyLimit: obtenerLimiteConcurrencia(),
    queryTimeoutMs: obtenerQueryTimeoutMs(),
    requestTimeoutMs: obtenerRequestTimeoutMs(),
    inflight: consultasEnVuelo,
    timeoutsFailFast,
    bulkheadRejections: rechazosBulkhead,
    completed: consultasCompletadas,
  };
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
          timeoutsFailFast += 1;
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

/**
 * Bulkhead + fail-fast: limita concurrencia y aplica timeout de consulta.
 * No inventa datos; solo acota espera bajo dependencia lenta/saturada.
 */
export async function conConsultaResiliente<T>(
  operacionFactory: () => Promise<T>,
): Promise<T> {
  const limite = obtenerLimiteConcurrencia();

  if (consultasEnVuelo >= limite) {
    rechazosBulkhead += 1;
    throw new Error(`DB_BULKHEAD_REJECTED_${limite}`);
  }

  consultasEnVuelo += 1;

  try {
    const resultado = await conTimeoutConsulta(operacionFactory());
    consultasCompletadas += 1;
    return resultado;
  } finally {
    consultasEnVuelo -= 1;
  }
}
