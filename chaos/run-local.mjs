/**
 * Runner local sin depender de pip/chaostoolkit.
 * Reproduce steady-state → inject → observe → recover → rollback.
 */
const base = process.env.HOTEL_BASE_URL || 'http://127.0.0.1:3000';
const token = process.env.CHAOS_LAB_TOKEN;
const habitacionId = process.env.HOTEL_HABITACION_ID || '1';
const observeMs = Number(process.env.CHAOS_OBSERVE_MS || 3000);

if (!token) {
  console.error('CHAOS_LAB_TOKEN requerido');
  process.exit(1);
}

async function req(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  return { status: response.status, body: await response.text() };
}

function assertStatus(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${expected}, obtenido ${actual}`);
  }
  console.log(`OK ${label} -> ${actual}`);
}

async function main() {
  console.log('=== STEADY STATE ===');
  assertStatus((await req('/live')).status, 200, 'live');
  assertStatus(
    (
      await req(`/api/v2/habitacion/${habitacionId}`, {
        headers: { 'x-trace-id': 'local-steady' },
      })
    ).status,
    200,
    'habitacion',
  );

  console.log('=== INJECT ===');
  assertStatus(
    (
      await req('/api/v2/chaos/dependency', {
        method: 'POST',
        headers: {
          'x-chaos-token': token,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ action: 'enable', durationSeconds: 60 }),
      })
    ).status,
    200,
    'enable',
  );

  assertStatus(
    (
      await req(`/api/v2/habitacion/${habitacionId}`, {
        headers: { 'x-trace-id': 'local-inject' },
      })
    ).status,
    503,
    'habitacion-chaos',
  );
  assertStatus((await req('/live')).status, 200, 'live-during-chaos');

  console.log(`=== OBSERVE ${observeMs}ms ===`);
  await new Promise((r) => setTimeout(r, observeMs));

  console.log('=== RECOVER ===');
  assertStatus(
    (
      await req('/api/v2/chaos/dependency', {
        method: 'POST',
        headers: {
          'x-chaos-token': token,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ action: 'disable' }),
      })
    ).status,
    200,
    'disable',
  );

  assertStatus(
    (
      await req(`/api/v2/habitacion/${habitacionId}`, {
        headers: { 'x-trace-id': 'local-recover' },
      })
    ).status,
    200,
    'habitacion-recovered',
  );

  console.log('Experimento local COMPLETADO');
}

main().catch(async (error) => {
  console.error('FALLO:', error.message);
  try {
    await fetch(`${base}/api/v2/chaos/dependency`, {
      method: 'POST',
      headers: {
        'x-chaos-token': token,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'disable' }),
    });
    console.error('Rollback aplicado');
  } catch {
    console.error('Rollback falló');
  }
  process.exit(1);
});
