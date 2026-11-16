/**
 * Compara dos resultados JSON generados por run-round.mjs
 * Uso: node scripts/experiments/compare-rounds.mjs <r0.json> <r1.json>
 */
import fs from 'node:fs';

const r0Path = process.argv[2];
const r1Path = process.argv[3];

if (!r0Path || !r1Path) {
  console.error('Uso: node scripts/experiments/compare-rounds.mjs <r0.json> <r1.json>');
  process.exit(1);
}

const r0 = JSON.parse(fs.readFileSync(r0Path, 'utf8'));
const r1 = JSON.parse(fs.readFileSync(r1Path, 'utf8'));

function delta(a, b) {
  const abs = Number((b - a).toFixed(4));
  const pct = a === 0 ? null : Number((((b - a) / a) * 100).toFixed(2));
  return { abs, pct };
}

const report = {
  metric: {
    success_rate: {
      r0: r0.success_rate,
      r1: r1.success_rate,
      delta: delta(r0.success_rate, r1.success_rate),
      note: 'Para caos de indisponibilidad, Hotel 503 NO es exito. Mejora E2E esperada en Sports (CB/timeout), no en success_rate de Hotel bajo caos.',
    },
    p95_ms: {
      r0: r0.p95_ms,
      r1: r1.p95_ms,
      delta: delta(r0.p95_ms, r1.p95_ms),
      note: 'Fail-fast (R1) deberia reducir p95 frente a timeouts largos en R0 si se simula lentitud DB.',
    },
    status_503: {
      r0: r0.status_503,
      r1: r1.status_503,
      delta: delta(r0.status_503, r1.status_503),
    },
  },
  warning:
    'Solo usar cifras de archivos reales generados. No inventar evidencias cloud.',
};

console.log(JSON.stringify(report, null, 2));
