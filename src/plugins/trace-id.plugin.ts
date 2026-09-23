import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

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

  request.log.info(
    {
      traceId,
      method: request.method,
      url: request.url,
    },
    'Peticion V2 recibida',
  );
}