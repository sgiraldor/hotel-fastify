import { FastifyInstance, FastifyRequest } from 'fastify';

let totalRequests = 0;
let requests2xx = 0;
let requests4xx = 0;
let requests5xx = 0;

let totalResponseTime = 0;

const requestStartTimes = new WeakMap<FastifyRequest, bigint>();

export function registrarMetricas(app: FastifyInstance) {
  app.addHook('onRequest', async (request) => {
    requestStartTimes.set(request, process.hrtime.bigint());
  });

  app.addHook('onResponse', async (request, reply) => {
    totalRequests++;

    const statusCode = reply.statusCode;

    if (statusCode >= 200 && statusCode < 300) {
      requests2xx++;
    } else if (statusCode >= 400 && statusCode < 500) {
      requests4xx++;
    } else if (statusCode >= 500) {
      requests5xx++;
    }

    const startTime = requestStartTimes.get(request);

    if (startTime !== undefined) {
      const responseTime =
        Number(process.hrtime.bigint() - startTime) / 1_000_000;

      totalResponseTime += responseTime;
    }
  });

  app.get('/metrics', async () => {
    const averageResponseTime =
      totalRequests > 0 ? totalResponseTime / totalRequests : 0;

    return {
      requests_total: totalRequests,
      requests_2xx: requests2xx,
      requests_4xx: requests4xx,
      requests_5xx: requests5xx,
      average_response_time_ms: Number(averageResponseTime.toFixed(2)),
    };
  });
}