/**
 * Perfil complementario LOCAL — degradación MySQL (Toxiproxy latency).
 * MISMO perfil en Baseline / R0 / R1 (no cambiar entre rondas).
 *
 * stages: 10s→8 VU, 40s hold, 10s→0  (~60s)
 * endpoint: GET /api/v2/habitacion/:id
 *
 * Hipótesis (declarada ANTES de ejecutar):
 * Bajo latencia MySQL ~2500ms, RESILIENCE_MODE=protected (R1) activa fail-fast
 * (HTTP 504 DB_QUERY_TIMEOUT y/o bulkhead) y reduce p95 frente a unprotected (R0),
 * que tiende a completar 200 con p95 ≈ latencia inyectada.
 * NO se afirma mejora de disponibilidad E2E del 503 total (experimento A).
 */
import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '10s', target: 8 },
    { duration: '40s', target: 8 },
    { duration: '10s', target: 0 },
  ],
};

const errorRate = new Rate('hotel_error_rate');
const successRate = new Rate('hotel_success_rate');
const latency = new Trend('hotel_latency_ms');
const status200 = new Counter('hotel_status_200');
const status504 = new Counter('hotel_status_504');
const status503 = new Counter('hotel_status_503');
const otherErr = new Counter('hotel_status_other_err');

const base = __ENV.HOTEL_BASE_URL || 'http://127.0.0.1:3000';
const id = __ENV.HABITACION_ID || '1';
const round = __ENV.ROUND || 'baseline';

export default function () {
  const res = http.get(`${base}/api/v2/habitacion/${id}`, {
    headers: { 'x-trace-id': `k6-mysql-${round}-${__VU}-${__ITER}` },
    tags: { round, experiment: 'mysql_degrade' },
    timeout: '35s',
  });

  latency.add(res.timings.duration);
  const ok = res.status === 200;
  successRate.add(ok);
  errorRate.add(res.status >= 500);

  if (res.status === 200) status200.add(1);
  else if (res.status === 504) status504.add(1);
  else if (res.status === 503) status503.add(1);
  else if (res.status >= 400) otherErr.add(1);

  check(res, {
    'status expected under degrade profile': (r) =>
      r.status === 200 || r.status === 504 || r.status === 503,
  });
}

export function handleSummary(data) {
  const out = {
    experiment: 'B_MYSQL_DEGRADE_COMPLEMENTARY',
    round,
    profile: 'LOCAL_MYSQL_DEGRADE_K6_V8_60S',
    hypothesis:
      'R1 protected acota p95 y activa fail-fast/bulkhead bajo latencia MySQL 2500ms; R0 unprotected sirve 200 con p95 alto',
    stages: options.stages,
    concurrency_peak_vus: 8,
    duration_total: '60s',
    metrics: {
      http_reqs: data.metrics.http_reqs,
      http_req_duration: data.metrics.http_req_duration,
      hotel_error_rate: data.metrics.hotel_error_rate,
      hotel_success_rate: data.metrics.hotel_success_rate,
      hotel_latency_ms: data.metrics.hotel_latency_ms,
      hotel_status_200: data.metrics.hotel_status_200,
      hotel_status_504: data.metrics.hotel_status_504,
      hotel_status_503: data.metrics.hotel_status_503,
    },
    captured_at: new Date().toISOString(),
  };

  return {
    stdout: JSON.stringify(out, null, 2),
    [`scripts/experiments/results/k6-mysql-${round}-summary.json`]:
      JSON.stringify(out, null, 2),
  };
}
