import { FastifyInstance, FastifyRequest } from 'fastify';
import { obtenerEstadoCaos } from '../plugins/chaos-dependency.plugin';
import { descripcionResilienciaDb } from '../config/database';
import { obtenerModoResiliencia } from '../config/resilience';

let totalRequests = 0;
let requests2xx = 0;
let requests4xx = 0;
let requests5xx = 0;
let requests503Chaos = 0;

let totalResponseTime = 0;
const responseTimes: number[] = [];
const startedAt = Date.now();

const requestStartTimes = new WeakMap<FastifyRequest, bigint>();

function calcularPercentil(valores: number[], percentil: number): number {
  if (valores.length === 0) {
    return 0;
  }

  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.ceil((percentil / 100) * ordenados.length) - 1;

  return ordenados[Math.max(0, indice)];
}

export function incrementarChaos503(): void {
  requests503Chaos += 1;
}

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
      responseTimes.push(responseTime);
    }
  });

  app.get('/metrics', async () => {
    const averageResponseTime =
      totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000);
    const chaos = obtenerEstadoCaos();
    const db = descripcionResilienciaDb();

    return {
      requests_total: totalRequests,
      requests_2xx: requests2xx,
      requests_4xx: requests4xx,
      requests_5xx: requests5xx,
      requests_503_chaos: requests503Chaos,
      average_response_time_ms: Number(averageResponseTime.toFixed(2)),
      p50_response_time_ms: Number(
        calcularPercentil(responseTimes, 50).toFixed(2),
      ),
      p95_response_time_ms: Number(
        calcularPercentil(responseTimes, 95).toFixed(2),
      ),
      p99_response_time_ms: Number(
        calcularPercentil(responseTimes, 99).toFixed(2),
      ),
      throughput_rps_approx: Number(
        (totalRequests / elapsedSeconds).toFixed(4),
      ),
      resilience_mode: obtenerModoResiliencia(),
      db,
      patterns: {
        fail_fast_timeouts: db.timeoutsFailFast,
        bulkhead_rejections: db.bulkheadRejections,
        inflight: db.inflight,
        completed_queries: db.completed,
      },
      chaos: {
        active: chaos.activo,
        activations: chaos.activations,
        injections: chaos.injections,
      },
      note: 'Metricas in-process por pod; usar OTLP/Prometheus para multi-replica',
    };
  });
}
