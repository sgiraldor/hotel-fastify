'use strict';

const http = require('http');
const port = Number(process.env.CHAOS_PORT || 3000);

const action = process.env.CHAOS_ACTION || 'status';
const duration = Number(process.env.CHAOS_DURATION || '120');
const habitacionId = process.env.HABITACION_ID || '1';

function call(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'x-chaos-token': process.env.CHAOS_LAB_TOKEN || '',
    };

    if (payload) {
      headers['content-type'] = 'application/json';
      headers['content-length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      { hostname: '127.0.0.1', port, path, method, headers },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            json = null;
          }
          resolve({
            status: res.statusCode,
            json,
          });
        });
      },
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function chaosPublico(body) {
  const chaos = body && body.chaos;
  if (!chaos) {
    return null;
  }

  return {
    envDown: chaos.envDown === true,
    temporalActivo: chaos.temporalActivo === true,
    activo: chaos.activo === true,
    until: chaos.until ?? null,
    activations: chaos.activations ?? 0,
    injections: chaos.injections ?? 0,
  };
}

async function main() {
  const out = {
    pod: process.env.HOSTNAME || 'unknown',
    action,
  };

  if (action === 'enable') {
    if (!Number.isFinite(duration) || duration < 1 || duration > 300) {
      out.error = 'durationSeconds fuera de 1..300';
      process.stdout.write(JSON.stringify(out));
      process.exit(2);
    }

    const enabled = await call('POST', '/api/v2/chaos/dependency', {
      action: 'enable',
      durationSeconds: duration,
    });
    out.controlStatus = enabled.status;
    out.chaos = chaosPublico(enabled.json);
  } else if (action === 'disable') {
    const disabled = await call('POST', '/api/v2/chaos/dependency', {
      action: 'disable',
    });
    out.controlStatus = disabled.status;
    out.chaos = chaosPublico(disabled.json);
  } else if (action === 'status') {
    const status = await call('GET', '/api/v2/chaos/dependency');
    out.controlStatus = status.status;
    out.chaos = chaosPublico(status.json);
  } else {
    out.error = 'action invalida';
    process.stdout.write(JSON.stringify(out));
    process.exit(2);
  }

  const habitacion = await call('GET', `/api/v2/habitacion/${habitacionId}`);
  const live = await call('GET', '/live');
  out.habitacionStatus = habitacion.status;
  out.habitacionCode =
    habitacion.json && habitacion.json.code ? habitacion.json.code : null;
  out.liveStatus = live.status;

  process.stdout.write(JSON.stringify(out));
  if (out.controlStatus !== 200) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.stdout.write(
    JSON.stringify({
      pod: process.env.HOSTNAME || 'unknown',
      error: error.message,
    }),
  );
  process.exit(1);
});
