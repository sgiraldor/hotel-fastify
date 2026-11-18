import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MINIMO_HABITACION = 3;

function formatoTasa(valor) {
  if (valor === 0 || valor === 1) {
    return String(valor);
  }
  return valor.toFixed(4);
}

export function evaluarObservaciones(entries) {
  const lista = Array.isArray(entries) ? entries : [];
  const habitacion = lista.filter((item) => item.phase === 'inject-habitacion');
  const live = lista.filter((item) => item.phase === 'inject-live');
  const recovery = lista.filter((item) => item.phase === 'recovery-habitacion');
  const causas = [];

  const aciertos503 = habitacion.filter((item) => item.status === 503).length;
  const tasa503 = habitacion.length === 0 ? 0 : aciertos503 / habitacion.length;
  if (habitacion.length < MINIMO_HABITACION || tasa503 !== 1) {
    causas.push(`CAUSA: habitacion_503_rate=${formatoTasa(tasa503)} umbral=1`);
  }

  const aciertosLive = live.filter((item) => item.status === 200).length;
  const tasaLive = live.length === 0 ? 0 : aciertosLive / live.length;
  if (live.length < 1 || tasaLive !== 1) {
    causas.push(`CAUSA: live_200_rate=${formatoTasa(tasaLive)} umbral=1`);
  }

  const ultima = recovery.length > 0 ? recovery[recovery.length - 1] : null;
  const recuperacion = ultima && typeof ultima.elapsed_s === 'number' ? ultima.elapsed_s : null;
  const recuperacionOk = ultima && ultima.status === 200 && recuperacion !== null && recuperacion <= 5;
  if (!recuperacionOk) {
    const observado = recuperacion === null ? 'sin-observaciones' : recuperacion;
    causas.push(`CAUSA: recuperacion_s=${observado} umbral<=5`);
  }

  return {
    ok: causas.length === 0,
    causas,
    habitacion_503_rate: tasa503,
    muestras_habitacion: habitacion.length,
    live_200_rate: tasaLive,
    muestras_live: live.length,
    recuperacion_s: recuperacion,
  };
}

export function informarEvaluacion(resultado) {
  const lineas = [
    `habitacion_503_rate=${formatoTasa(resultado.habitacion_503_rate)}`,
    `muestras_habitacion=${resultado.muestras_habitacion}`,
    `live_200_rate=${formatoTasa(resultado.live_200_rate)}`,
    `muestras_live=${resultado.muestras_live}`,
    `recuperacion_s=${resultado.recuperacion_s === null ? 'sin-observaciones' : resultado.recuperacion_s}`,
    ...resultado.causas,
  ];
  return lineas.join('\n');
}

function ejecutadoDirectamente() {
  const entrada = process.argv[1];
  if (!entrada) {
    return false;
  }
  return import.meta.url === pathToFileURL(path.resolve(entrada)).href;
}

if (ejecutadoDirectamente()) {
  const archivo = process.argv[2];
  if (!archivo || !fs.existsSync(archivo)) {
    console.log('CAUSA: habitacion_503_rate=sin-observaciones umbral=1');
    process.exit(1);
  }
  const entries = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  const resultado = evaluarObservaciones(entries);
  console.log(informarEvaluacion(resultado));
  process.exit(resultado.ok ? 0 : 1);
}
