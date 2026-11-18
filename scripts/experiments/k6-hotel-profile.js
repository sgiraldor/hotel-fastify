/**
 * Perfil LOCAL provisional k6 (Samuel) hasta recibir el perfil común de Jarrison.
 *
 * DECLARADO — no cambiar entre Baseline / R0 / R1:
 * - stages: 0→5 VU (5s), hold 5 VU (25s), 5→0 (5s)  => ~35s útiles
 * - endpoint: GET /api/v2/habitacion/:id
 * - think time: 0 (máxima presión del perfil)
 *
 * Uso:
 *   k6 run -e HOTEL_BASE_URL=http://127.0.0.1:3000 -e HABITACION_ID=1 -e ROUND=baseline scripts/experiments/k6-hotel-profile.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '5s', target: 5 },
    { duration: '25s', target: 5 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    // Umbrales informativos; no fallan el experimento académico por diseño
    http_req_failed: ['rate<1'],
  },
};

const errorRate = new Rate('hotel_error_rate');
const p95Custom = new Trend('hotel_latency_ms');

const base = __ENV.HOTEL_BASE_URL || 'http://127.0.0.1:3000';
const id = __ENV.HABITACION_ID || '1';
const round = __ENV.ROUND || 'baseline';

export default function () {
  const res = http.get(`${base}/api/v2/habitacion/${id}`, {
    headers: { 'x-trace-id': `k6-${round}-${__VU}-${__ITER}` },
    tags: { round, endpoint: 'habitacion_v2' },
  });

  const ok = check(res, {
    'status is 200 or 503': (r) => r.status === 200 || r.status === 503,
  });

  errorRate.add(res.status >= 500);
  p95Custom.add(res.timings.duration);

  if (!ok) {
    sleep(0.01);
  }
}

export function handleSummary(data) {
  const out = {
    round,
    profile: 'LOCAL_PROVISIONAL_K6_V5_35S',
    stages: options.stages,
    concurrency_peak_vus: 5,
    duration_total: '35s',
    metrics: {
      http_reqs: data.metrics.http_reqs,
      http_req_failed: data.metrics.http_req_failed,
      http_req_duration: data.metrics.http_req_duration,
      hotel_error_rate: data.metrics.hotel_error_rate,
      hotel_latency_ms: data.metrics.hotel_latency_ms,
    },
    captured_at: new Date().toISOString(),
  };

  return {
    stdout: JSON.stringify(out, null, 2),
    [`scripts/experiments/results/k6-${round}-summary.json`]: JSON.stringify(
      out,
      null,
      2,
    ),
  };
}
