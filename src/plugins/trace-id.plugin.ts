import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { context, trace } from '@opentelemetry/api';

export const almacenamientoTrazaFuncional = new AsyncLocalStorage<{
  xTraceId: string;
}>();

export async function traceIdHook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.url.startsWith('/api/v2/')) {
    return;
  }

  const incomingTraceId = request.headers['x-trace-id'];

  const traceId =
    typeof incomingTraceId === 'string' && incomingTraceId.trim() !== ''
      ? incomingTraceId
      : randomUUID();

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