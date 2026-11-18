import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { traceIdDeLaPeticion } from './trace-id.plugin';

let chaosUntilMs: number | null = null;
let chaosActivations = 0;
let chaosInjections = 0;

export function obtenerEstadoCaos() {
  const envDown = process.env.CHAOS_DEPENDENCY_DOWN === 'true';
  const now = Date.now();
  const temporalActivo =
    chaosUntilMs !== null && now < chaosUntilMs ? true : false;

  if (chaosUntilMs !== null && now >= chaosUntilMs) {
    chaosUntilMs = null;
  }

  return {
    envDown,
    temporalActivo,
    activo: envDown || temporalActivo,
    until: chaosUntilMs,
    activations: chaosActivations,
    injections: chaosInjections,
  };
}

export function registrarInyeccionCaos(): void {
  chaosInjections += 1;
}

export function activarCaosTemporal(durationSeconds: number): number {
  const segundos = Math.max(1, Math.min(durationSeconds, 300));
  chaosUntilMs = Date.now() + segundos * 1000;
  chaosActivations += 1;
  return segundos;
}

export function desactivarCaosTemporal(): void {
  chaosUntilMs = null;
}

function tokenValido(request: FastifyRequest): boolean {
  const esperado = process.env.CHAOS_LAB_TOKEN?.trim();

  if (!esperado) {
    return false;
  }

  const headerToken = request.headers['x-chaos-token'];
  return typeof headerToken === 'string' && headerToken === esperado;
}

function headerSolicitaCaos(request: FastifyRequest): boolean {
  const valor = request.headers['x-chaos-dependency'];
  return typeof valor === 'string' && valor.toLowerCase() === 'down';
}

function rutaDeIntegracion(url: string): boolean {
  return url.startsWith('/api/v2/habitacion');
}

export async function chaosDependencyHook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const url = request.url.split('?')[0];

  if (url === '/live' || url === '/ready' || url === '/metrics') {
    return;
  }

  if (!rutaDeIntegracion(url)) {
    return;
  }

  const estado = obtenerEstadoCaos();
  const porHeader = headerSolicitaCaos(request) && tokenValido(request);

  if (!estado.activo && !porHeader) {
    return;
  }

  if (porHeader && !estado.activo) {
    // inyeccion puntual por request autenticada de laboratorio
  }

  const traceId = request.url.startsWith('/api/v2/')
    ? traceIdDeLaPeticion(request)
    : 'n/a';

  registrarInyeccionCaos();

  request.log.warn(
    {
      evento: 'chaos_dependency_down',
      traceId,
      path: url,
      source: estado.envDown
        ? 'env'
        : estado.temporalActivo
          ? 'temporal'
          : 'header',
    },
    'Indisponibilidad controlada de Hotel activada',
  );

  const retryAfter = Number(process.env.CHAOS_RETRY_AFTER_SECONDS || 5);

  reply.header('Retry-After', String(retryAfter));
  if (request.url.startsWith('/api/v2/')) {
    reply.header('x-trace-id', traceId);
  }

  return reply.code(503).send({
    message: 'Hotel temporalmente indisponible (experimento de caos)',
    code: 'CHAOS_DEPENDENCY_DOWN',
    traceId,
    retryAfterSeconds: retryAfter,
  });
}

export async function chaosControlRoutes(app: FastifyInstance) {
  app.get('/api/v2/chaos/dependency', async (request, reply) => {
    if (!tokenValido(request)) {
      return reply.code(401).send({
        message: 'Token de laboratorio invalido o ausente',
      });
    }

    return reply.code(200).send({
      service: 'hotel-api',
      chaos: obtenerEstadoCaos(),
    });
  });

  app.post<{
    Body: { action?: string; durationSeconds?: number };
  }>('/api/v2/chaos/dependency', async (request, reply) => {
    if (!tokenValido(request)) {
      return reply.code(401).send({
        message: 'Token de laboratorio invalido o ausente',
      });
    }

    const action = request.body?.action || 'status';

    if (action === 'enable') {
      const duration = activarCaosTemporal(
        Number(request.body?.durationSeconds || 60),
      );

      request.log.warn(
        {
          evento: 'chaos_dependency_enable',
          durationSeconds: duration,
        },
        'Caos temporal habilitado',
      );

      return reply.code(200).send({
        message: 'Caos habilitado',
        durationSeconds: duration,
        chaos: obtenerEstadoCaos(),
      });
    }

    if (action === 'disable') {
      desactivarCaosTemporal();
      request.log.info(
        { evento: 'chaos_dependency_disable' },
        'Caos temporal deshabilitado',
      );

      return reply.code(200).send({
        message: 'Caos deshabilitado',
        chaos: obtenerEstadoCaos(),
      });
    }

    return reply.code(200).send({
      chaos: obtenerEstadoCaos(),
    });
  });
}
