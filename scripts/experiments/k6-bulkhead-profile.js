/**
 * Perfil LOCAL — activación de bulkhead bajo alta concurrencia.
 * MISMO perfil en R0 y R1 (no cambiar entre rondas).
 *
 * stages: 5s→24 VU, 40s hold, 5s→0 (~50s)
 * endpoint: GET /api/v2/habitacion/:id
 */
import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '5s', target: 24 },
    { duration: '40s', target: 24 },
    { duration: '5s', target: 0 },
  ],
};

const errorRate = new Rate('hotel_error_rate');
const successRate = new Rate('hotel_success_rate');
const latencyAll = new Trend('hotel_latency_ms');
const latencyOk = new Trend('hotel_latency_success_ms');
const status200 = new Counter('hotel_status_200');
const status503 = new Counter('hotel_status_503');
const status504 = new Counter('hotel_status_504');
const statusOther = new Counter('hotel_status_other');

const base = __ENV.HOTEL_BASE_URL || 'http://127.0.0.1:3000';
const id = __ENV.HABITACION_ID || '1';
const round = __ENV.ROUND || 'r0';

export default function () {
  const res = http.get(`${base}/api/v2/habitacion/${id}`, {
    headers: { 'x-trace-id': `k6-bh-${round}-${__VU}-${__ITER}` },
    tags: { round, experiment: 'bulkhead' },
    timeout: '35s',
  });

  latencyAll.add(res.timings.duration);
  const ok = res.status === 200;
  successRate.add(ok);
  errorRate.add(res.status >= 500);

  if (ok) {
    status200.add(1);
    latencyOk.add(res.timings.duration);
  } else if (res.status === 503) status503.add(1);
  else if (res.status === 504) status504.add(1);
  else statusOther.add(1);

  check(res, {
    'expected statuses under bulkhead profile': (r) =>
      r.status === 200 || r.status === 503 || r.status === 504,
  });
}

export function handleSummary(data) {
  const out = {
    experiment: 'C_BULKHEAD_HIGH_CONCURRENCY',
    round,
    profile: 'LOCAL_BULKHEAD_K6_V24_50S',
    stages: options.stages,
    concurrency_peak_vus: 24,
    duration_total: '50s',
    metrics: {
      http_reqs: data.metrics.http_reqs,
      http_req_duration: data.metrics.http_req_duration,
      hotel_error_rate: data.metrics.hotel_error_rate,
      hotel_success_rate: data.metrics.hotel_success_rate,
      hotel_latency_ms: data.metrics.hotel_latency_ms,
      hotel_latency_success_ms: data.metrics.hotel_latency_success_ms,
      hotel_status_200: data.metrics.hotel_status_200,
      hotel_status_503: data.metrics.hotel_status_503,
      hotel_status_504: data.metrics.hotel_status_504,
    },
    captured_at: new Date().toISOString(),
  };

  return {
    stdout: JSON.stringify(out, null, 2),
    [`scripts/experiments/results/k6-bulkhead-${round}-summary.json`]:
      JSON.stringify(out, null, 2),
  };
}
