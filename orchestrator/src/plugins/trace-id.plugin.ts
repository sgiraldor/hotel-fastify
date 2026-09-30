import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';

export const almacenamientoTrazaFuncional = new AsyncLocalStorage<{
  xTraceId: string;
}>();

declare module 'fastify' {
  interface FastifyRequest {
    functionalTraceId?: string;
  }
}

export function resolverTraceId(
  incoming: string | string[] | undefined,
): string {
  if (typeof incoming === 'string' && incoming.trim() !== '') {
    return incoming;
  }

  return randomUUID();
}

export function traceIdDeLaPeticion(request: FastifyRequest): string {
  if (request.functionalTraceId) {
    return request.functionalTraceId;
  }

  return resolverTraceId(request.headers['x-trace-id']);
}

export async function traceIdHook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.url.startsWith('/api/')) {
    return;
  }

  const traceId = resolverTraceId(request.headers['x-trace-id']);

  request.functionalTraceId = traceId;
  reply.header('x-trace-id', traceId);
  almacenamientoTrazaFuncional.enterWith({ xTraceId: traceId });
}
