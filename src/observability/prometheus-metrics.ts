import { FastifyInstance, FastifyRequest } from 'fastify';
import { obtenerEstadoCaos } from '../plugins/chaos-dependency.plugin';
import {
  obtenerModoResiliencia,
  obtenerEstadisticasResiliencia,
} from '../config/resilience';

let total = 0;
let errors5xx = 0;
const durations: number[] = [];
const starts = new WeakMap<FastifyRequest, bigint>();
const startedAt = Date.now();

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function registrarPrometheus(app: FastifyInstance) {
  app.addHook('onRequest', async (request) => {
    starts.set(request, process.hrtime.bigint());
  });

  app.addHook('onResponse', async (_request, reply) => {
    total += 1;
    if (reply.statusCode >= 500) errors5xx += 1;

    const start = starts.get(_request);
    if (start !== undefined) {
      durations.push(Number(process.hrtime.bigint() - start) / 1_000_000);
    }
  });

  app.get('/metrics/prometheus', async (_request, reply) => {
    const chaos = obtenerEstadoCaos();
    const stats = obtenerEstadisticasResiliencia();
    const elapsed = Math.max(1, (Date.now() - startedAt) / 1000);
    const p95 = percentile(durations, 95);
    const rps = total / elapsed;

    const body = [
      '# HELP hotel_http_requests_total Total HTTP requests',
      '# TYPE hotel_http_requests_total counter',
      `hotel_http_requests_total ${total}`,
      '# HELP hotel_http_errors_5xx_total Total HTTP 5xx',
      '# TYPE hotel_http_errors_5xx_total counter',
      `hotel_http_errors_5xx_total ${errors5xx}`,
      '# HELP hotel_chaos_503_total Chaos injections counted via metrics hook companion',
      '# TYPE hotel_chaos_503_total counter',
      `hotel_chaos_503_total ${chaos.injections}`,
      '# HELP hotel_http_p95_ms Approximate p95 latency ms (per pod)',
      '# TYPE hotel_http_p95_ms gauge',
      `hotel_http_p95_ms ${p95.toFixed(2)}`,
      '# HELP hotel_http_throughput_rps Approximate throughput',
      '# TYPE hotel_http_throughput_rps gauge',
      `hotel_http_throughput_rps ${rps.toFixed(4)}`,
      '# HELP hotel_chaos_active Chaos switch active',
      '# TYPE hotel_chaos_active gauge',
      `hotel_chaos_active ${chaos.activo ? 1 : 0}`,
      '# HELP hotel_resilience_protected 1 if RESILIENCE_MODE=protected',
      '# TYPE hotel_resilience_protected gauge',
      `hotel_resilience_protected ${obtenerModoResiliencia() === 'protected' ? 1 : 0}`,
      '# HELP hotel_db_failfast_timeouts_total Fail-fast query timeouts',
      '# TYPE hotel_db_failfast_timeouts_total counter',
      `hotel_db_failfast_timeouts_total ${stats.timeoutsFailFast}`,
      '# HELP hotel_db_bulkhead_rejections_total Bulkhead concurrency rejections',
      '# TYPE hotel_db_bulkhead_rejections_total counter',
      `hotel_db_bulkhead_rejections_total ${stats.bulkheadRejections}`,
      '# HELP hotel_db_inflight In-flight DB queries',
      '# TYPE hotel_db_inflight gauge',
      `hotel_db_inflight ${stats.inflight}`,
      '# HELP hotel_db_peak_inflight Peak in-flight DB queries since process start',
      '# TYPE hotel_db_peak_inflight gauge',
      `hotel_db_peak_inflight ${stats.peakInflight}`,
      '# HELP hotel_db_concurrency_limit Bulkhead concurrency limit',
      '# TYPE hotel_db_concurrency_limit gauge',
      `hotel_db_concurrency_limit ${stats.concurrencyLimit}`,
      '# HELP hotel_db_pool_limit Configured MySQL pool limit',
      '# TYPE hotel_db_pool_limit gauge',
      `hotel_db_pool_limit ${stats.poolLimit}`,
      '',
    ].join('\n');

    return reply
      .header('content-type', 'text/plain; version=0.0.4')
      .send(body);
  });
}
