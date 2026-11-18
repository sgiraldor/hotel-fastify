import fs from 'node:fs';
import path from 'node:path';
import { urlPermitida } from './gate-policy.mjs';

const base = process.env.HOTEL_BASE_URL || '';
const obsFile = process.env.GATE_OBS_FILE || '';
const habitacionId = process.env.HOTEL_HABITACION_ID || '1';
const token = process.env.CHAOS_LAB_TOKEN || '';
const phase = process.argv[2];
const expectIndex = process.argv.indexOf('--expect');
const expected = expectIndex >= 0 ? process.argv[expectIndex + 1] : 'any';

function salir(mensaje, codigo = 1) {
  console.error(mensaje);
  process.exit(codigo);
}

function leer() {
  if (!fs.existsSync(obsFile)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(obsFile, 'utf8'));
}

function guardar(entries) {
  fs.mkdirSync(path.dirname(obsFile), { recursive: true });
  fs.writeFileSync(obsFile, JSON.stringify(entries, null, 2));
}

function anotar(entry) {
  const entries = leer();
  entries.push({ ...entry, at: new Date().toISOString() });
  guardar(entries);
}

async function estado(ruta, headers = {}) {
  const respuesta = await fetch(`${base}${ruta}`, { headers });
  return respuesta.status;
}

async function main() {
  if (!urlPermitida(base)) {
    salir('CAUSA: HOTEL_BASE_URL rechazada. Solo se admite http://127.0.0.1:3000');
  }
  if (!obsFile) {
    salir('CAUSA: GATE_OBS_FILE ausente');
  }
  if (!phase) {
    salir('CAUSA: falta la fase de la sonda');
  }

  if (phase === 'mark-disable') {
    anotar({ phase: 'disable', status: null });
    console.log('disable_marcado=1');
    return;
  }

  if (phase === 'disable') {
    if (!token) {
      salir('CAUSA: token temporal ausente para el disable');
    }
    const respuesta = await fetch(`${base}/api/v2/chaos/dependency`, {
      method: 'POST',
      headers: {
        'x-chaos-token': token,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'disable' }),
    });
    console.log(`disable_status=${respuesta.status}`);
    if (respuesta.status !== 200) {
      process.exit(1);
    }
    return;
  }

  if (phase === 'recovery-habitacion') {
    const previo = leer();
    const marca = [...previo].reverse().find((item) => item.phase === 'disable');
    const inicio = marca ? Date.parse(marca.at) : Date.now();
    let status = 0;
    const limite = inicio + 5000;
    do {
      status = await estado(`/api/v2/habitacion/${habitacionId}`, {
        'x-trace-id': 'gate-recovery',
      });
      if (status === 200) {
        break;
      }
      await new Promise((resolver) => setTimeout(resolver, 200));
    } while (Date.now() < limite);
    const elapsed = Number(((Date.now() - inicio) / 1000).toFixed(3));
    anotar({ phase, status, elapsed_s: elapsed });
    console.log(`recovery-habitacion=${status} recuperacion_s=${elapsed}`);
    if (expected !== 'any' && (status !== 200 || elapsed > 5)) {
      process.exit(1);
    }
    return;
  }

  const ruta = phase === 'inject-live'
    ? '/live'
    : `/api/v2/habitacion/${habitacionId}`;
  const status = await estado(ruta, { 'x-trace-id': `gate-${phase}` });
  anotar({ phase, status });
  console.log(`${phase}=${status}`);
  if (expected !== 'any' && String(status) !== expected) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`CAUSA: sonda ${phase || 'desconocida'} no pudo observar (${error.name})`);
  process.exit(1);
});
