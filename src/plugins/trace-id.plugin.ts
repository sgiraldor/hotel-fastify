import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { context, trace } from '@opentelemetry/api';

export const almacenamientoTrazaFuncional = new AsyncLocalStorage<{
  xTraceId: string;
}>();

declare module 'fastify' {
  interface FastifyRequest {
    functionalTraceId?: string;
  }
}

export function resolverTraceId(incoming: unknown): string {
  if (typeof incoming === 'string' && incoming.trim() !== '') {
    return incoming.trim();
  }

  return randomUUID();
}

export function traceIdDeLaPeticion(request: FastifyRequest): string {
  if (request.functionalTraceId) {
    return request.functionalTraceId;
  }

  return resolverTraceId(request.headers['x-trace-id']);
}

/**
 * Propaga el correlation ID funcional (x-trace-id).
 * W3C traceparent/tracestate los propaga OpenTelemetry vía instrumentation-http
 * (trace ID de OTel ≠ span ID; x-trace-id es el ID de negocio compartido con Sports).
 */
export async function traceIdHook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.url.startsWith('/api/v2/')) {
    return;
  }

  const traceId = resolverTraceId(request.headers['x-trace-id']);

  request.functionalTraceId = traceId;
  reply.header('x-trace-id', traceId);
  almacenamientoTrazaFuncional.enterWith({ xTraceId: traceId });

  const contexto = trace.getSpan(context.active())?.spanContext();

  request.log.info(
    {
      traceId,
      xTraceId: traceId,
      ...(contexto
        ? {
            otelTraceId: contexto.traceId,
            otelSpanId: contexto.spanId,
          }
        : {}),
      method: request.method,
      url: request.url,
    },
    'Peticion V2 recibida',
  );
}
