import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { informarEvaluacion, evaluarObservaciones } from '../chaos/gate-evaluator.mjs';
import { URL_PERMITIDA, urlPermitida } from '../chaos/gate-policy.mjs';

const raiz = path.resolve(__dirname, '..');

function leer(relativo: string) {
  return fs.readFileSync(path.join(raiz, relativo), 'utf8');
}

describe('evaluador del chaos gate', () => {
  it('aprueba 503 completo, /live en 200 y recuperación dentro de 5 s', () => {
    const resultado = evaluarObservaciones([
      { phase: 'inject-habitacion', status: 503 },
      { phase: 'inject-habitacion', status: 503 },
      { phase: 'inject-habitacion', status: 503 },
      { phase: 'inject-live', status: 200 },
      { phase: 'recovery-habitacion', status: 200, elapsed_s: 0.042 },
    ]);

    expect(resultado.ok).toBe(true);
    expect(resultado.causas).toEqual([]);
    expect(resultado.habitacion_503_rate).toBe(1);
    expect(resultado.live_200_rate).toBe(1);
    expect(resultado.recuperacion_s).toBe(0.042);
    expect(informarEvaluacion(resultado).includes('CAUSA:')).toBe(false);
  });

  it('falla cuando la habitación no está toda en 503', () => {
    const resultado = evaluarObservaciones([
      { phase: 'inject-habitacion', status: 200 },
      { phase: 'inject-habitacion', status: 200 },
      { phase: 'inject-habitacion', status: 200 },
      { phase: 'inject-live', status: 200 },
      { phase: 'recovery-habitacion', status: 200, elapsed_s: 0.01 },
    ]);

    expect(resultado.ok).toBe(false);
    expect(resultado.habitacion_503_rate).toBe(0);
    expect(resultado.causas).toContain('CAUSA: habitacion_503_rate=0 umbral=1');
  });

  it('falla si /live sale del radio o la recuperación tarda más de 5 s', () => {
    const resultado = evaluarObservaciones([
      { phase: 'inject-habitacion', status: 503 },
      { phase: 'inject-habitacion', status: 503 },
      { phase: 'inject-habitacion', status: 503 },
      { phase: 'inject-live', status: 503 },
      { phase: 'recovery-habitacion', status: 503, elapsed_s: 5.2 },
    ]);

    expect(resultado.ok).toBe(false);
    expect(resultado.causas).toContain('CAUSA: live_200_rate=0 umbral=1');
    expect(resultado.causas).toContain('CAUSA: recuperacion_s=5.2 umbral<=5');
  });

  it('retira el token temporal de las evidencias', async () => {
    const { spawnSync } = await import('node:child_process');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-scrub-'));
    const token = 'token-de-prueba-0123456789abcdef';
    fs.writeFileSync(path.join(dir, 'journal.json'), `{"header":"${token}"}`);
    const corrida = spawnSync(process.execPath, [path.join(raiz, 'chaos/gate-scrub.mjs'), dir], {
      env: { ...process.env, CHAOS_LAB_TOKEN: token },
      encoding: 'utf8',
    });

    expect(corrida.status).toBe(0);
    expect(fs.readFileSync(path.join(dir, 'journal.json'), 'utf8')).not.toContain(token);
    expect(corrida.stdout).not.toContain(token);
  });
});

describe('el experimento no sale del runner', () => {
  const archivos = [
    'chaos/experiment-hotel-gate.json',
    'chaos/experiment-hotel-gate-negative.json',
    '.github/workflows/chaos-hotel-manual.yml',
  ];

  it('solo admite el loopback del runner', () => {
    expect(urlPermitida(URL_PERMITIDA)).toBe(true);
    expect(urlPermitida('http://149.130.165.30')).toBe(false);
    expect(urlPermitida('http://3.21.120.51:30080')).toBe(false);
    expect(urlPermitida('http://127.0.0.1:3001')).toBe(false);
    expect(urlPermitida('http://localhost:3000')).toBe(false);
  });

  it('los archivos del gate no nombran infraestructura compartida', () => {
    const prohibido = ['149.130.165.30', '3.21.120.51', 'flujo-profile-shared.js', 'amazonaws', 'googleapis'];
    for (const archivo of archivos) {
      const texto = leer(archivo);
      for (const marca of prohibido) {
        expect(texto.includes(marca), `${archivo} contiene ${marca}`).toBe(false);
      }
    }
  });

  it('el experimento positivo inyecta 15 s y el negativo no activa el fallo', () => {
    const positivo = JSON.parse(leer('chaos/experiment-hotel-gate.json'));
    const negativo = JSON.parse(leer('chaos/experiment-hotel-gate-negative.json'));
    const enable = positivo.method.find((paso: { name: string }) => paso.name === 'enable-hotel-chaos');

    expect(positivo.configuration.hotel_base_url.default).toBe(URL_PERMITIDA);
    expect(negativo.configuration.hotel_base_url.default).toBe(URL_PERMITIDA);
    expect(enable.provider.arguments.durationSeconds).toBe(15);
    expect(positivo.rollbacks[0].provider.arguments.action).toBe('disable');
    expect(negativo.method.some((paso: { name: string }) => paso.name.includes('enable'))).toBe(false);
  });

  it('el workflow ejecuta Chaos Toolkit, publica artefactos rojos y limpia siempre', () => {
    const workflow = leer('.github/workflows/chaos-hotel-manual.yml');

    expect(workflow).toContain('chaos run');
    expect(workflow).toContain('--rollback-strategy always');
    expect(workflow).toContain('node chaos/gate-preflight.mjs');
    expect(workflow).toContain('if: always()');
    expect(workflow).toContain('docker compose down -v --remove-orphans');
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).not.toContain('dry_run');
  });
});
