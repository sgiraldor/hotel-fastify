import fs from 'node:fs';
import path from 'node:path';

const token = process.env.CHAOS_LAB_TOKEN || '';
const dir = process.argv[2];

if (token.length < 16) {
  console.error('CAUSA: token temporal ausente; no se publican evidencias sin retirarlo');
  process.exit(1);
}
if (!dir || !fs.existsSync(dir)) {
  console.error('CAUSA: directorio de evidencias ausente');
  process.exit(1);
}

let archivos = 0;

function recorrer(actual) {
  for (const nombre of fs.readdirSync(actual)) {
    const ruta = path.join(actual, nombre);
    const stat = fs.statSync(ruta);
    if (stat.isDirectory()) {
      recorrer(ruta);
      continue;
    }
    const texto = fs.readFileSync(ruta).toString('utf8');
    if (!texto.includes(token)) {
      continue;
    }
    fs.writeFileSync(ruta, texto.split(token).join('***'));
    archivos += 1;
    console.log(`token_retirado=${nombre}`);
  }
}

recorrer(dir);
console.log(`archivos_limpios=${archivos}`);
