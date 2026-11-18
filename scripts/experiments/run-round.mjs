/**
 * Perfil LOCAL provisional (declarado) hasta recibir k6 comun de Jarrison.
 * Uso:
 *   node scripts/experiments/run-round.mjs baseline
 *   node scripts/experiments/run-round.mjs r0
 *   node scripts/experiments/run-round.mjs r1
 */
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.HOTEL_BASE_URL || 'http://127.0.0.1:3000';
const token = process.env.CHAOS_LAB_TOKEN || '';
const habitacionId = process.env.HOTEL_HABITACION_ID || '1';
const requests = Number(process.env.ROUND_REQUESTS || 30);
const round = process.argv[2] || 'baseline';

if (!['baseline', 'r0', 'r1'].includes(round)) {
  console.error('Uso: node scripts/experiments/run-round.mjs <baseline|r0|r1>');
  process.exit(1);
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body, ms: 0 };
}

async function timed(url, options) {
  const start = performance.now();
  const result = await getJson(url, options);
  result.ms = performance.now() - start;
  return result;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function setChaos(action) {
  if (!token) {
    throw new Error('CHAOS_LAB_TOKEN requerido para r0/r1');
  }
  await fetch(`${base}/api/v2/chaos/dependency`, {
    method: 'POST',
    headers: {
      'x-chaos-token': token,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      action,
      durationSeconds: 120,
    }),
  });
}

async function main() {
  console.log(`Round=${round} base=${base} profile=LOCAL_PROVISIONAL`);

  if (round === 'r0' || round === 'r1') {
    await setChaos('enable');
  }

  const latencies = [];
  let ok = 0;
  let fail = 0;
  let status503 = 0;

  for (let i = 0; i < requests; i++) {
    const result = await timed(`${base}/api/v2/habitacion/${habitacionId}`, {
      headers: { 'x-trace-id': `${round}-${i}` },
    });
    latencies.push(result.ms);
    if (result.status >= 200 && result.status < 300) ok += 1;
    else fail += 1;
    if (result.status === 503) status503 += 1;
  }

  if (round === 'r0' || round === 'r1') {
    await setChaos('disable');
  }

  const metrics = await getJson(`${base}/metrics`);
  const summary = {
    round,
    profile: 'LOCAL_PROVISIONAL_CURL_LOOP',
    note: 'Sustituir por k6 comun de Jarrison cuando este disponible. No inventa evidencia cloud.',
    requests,
    success: ok,
    failures: fail,
    status_503: status503,
    success_rate: Number(((ok / requests) * 100).toFixed(2)),
    p95_ms: Number(percentile(latencies, 95).toFixed(2)),
    avg_ms: Number(
      (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2),
    ),
    hotel_metrics_snapshot: metrics.body,
    captured_at: new Date().toISOString(),
  };

  const outDir = path.join('scripts', 'experiments', 'results');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${round}-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Saved ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
