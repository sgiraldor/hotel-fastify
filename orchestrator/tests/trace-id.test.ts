import { describe, expect, it, vi, afterEach } from 'vitest';
import Fastify from 'fastify';
import { traceIdHook } from '../src/plugins/trace-id.plugin';
import { sportsRoutes } from '../src/routes/sports.routes';
import { hotelRoutes } from '../src/routes/hotel.routes';
import { orchestratorRoutes } from '../src/routes/orchestrator.routes';
import { obtenerHabitaciones } from '../src/clients/hotel.client';
import { obtenerPeliculas } from '../src/clients/cine.client';
import { obtenerTorneos } from '../src/clients/sports.client';
import { guardarCache } from '../src/clients/cache.client';
import { saveArtifact } from '../src/clients/storage.client';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function encabezados(init?: RequestInit): Record<string, string> {
  const headers = new Headers(init?.headers);
  return Object.fromEntries(headers.entries());
}

describe('x-trace-id del orquestador', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('preserva el x-trace-id recibido y lo devuelve', async () => {
    const app = Fastify({ logger: false });
    app.addHook('onRequest', traceIdHook);
    await app.register(orchestratorRoutes);

    const respuesta = await app.inject({
      method: 'POST',
      url: '/api/v2/orchestrator/dinamico',
      headers: { 'x-trace-id': 'oci-otel-test-001' },
      payload: {},
    });

    expect(respuesta.statusCode).toBe(400);
    expect(respuesta.headers['x-trace-id']).toBe('oci-otel-test-001');
    expect(respuesta.json().traceId).toBe('oci-otel-test-001');
    await app.close();
  });

  it('genera un solo x-trace-id cuando no llega o esta vacio', async () => {
    const app = Fastify({ logger: false });
    app.addHook('onRequest', traceIdHook);
    await app.register(orchestratorRoutes);

    const sinHeader = await app.inject({
      method: 'POST',
      url: '/api/v2/orchestrator/dinamico',
      payload: {},
    });

    const vacio = await app.inject({
      method: 'POST',
      url: '/api/v2/orchestrator/dinamico',
      headers: { 'x-trace-id': '   ' },
      payload: {},
    });

    expect(sinHeader.headers['x-trace-id']).toMatch(UUID);
    expect(vacio.headers['x-trace-id']).toMatch(UUID);
    expect(sinHeader.headers['x-trace-id']).not.toBe(
      vacio.headers['x-trace-id'],
    );
    expect(sinHeader.json().traceId).toBe(sinHeader.headers['x-trace-id']);
    await app.close();
  });

  it('no agrega x-trace-id al healthcheck', async () => {
    const app = Fastify({ logger: false });
    app.addHook('onRequest', traceIdHook);
    app.get('/', async () => ({ message: 'MS orquestador funcionando' }));

    const respuesta = await app.inject({ method: 'GET', url: '/' });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.headers['x-trace-id']).toBeUndefined();
    await app.close();
  });

  it('propaga el mismo x-trace-id a Hotel, Sports, Cine, Cache y Object Storage', async () => {
    const llamadas: Array<{ url: string; headers: Record<string, string> }> =
      [];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        llamadas.push({ url: String(url), headers: encabezados(init) });

        if (String(url).includes('/cache/')) {
          return new Response(JSON.stringify({}), { status: 404 });
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );

    const app = Fastify({ logger: false });
    app.addHook('onRequest', traceIdHook);
    await app.register(sportsRoutes);
    await app.register(hotelRoutes);

    const deportes = await app.inject({
      method: 'GET',
      url: '/api/v2/sports/jugadores/4',
      headers: { 'x-trace-id': 'oci-otel-test-001' },
    });

    const hotel = await app.inject({
      method: 'GET',
      url: '/api/v2/hotel/huesped/4',
      headers: { 'x-trace-id': 'oci-otel-test-001' },
    });

    expect(deportes.statusCode).toBe(200);
    expect(deportes.headers['x-trace-id']).toBe('oci-otel-test-001');
    expect(hotel.statusCode).toBe(200);
    expect(hotel.headers['x-trace-id']).toBe('oci-otel-test-001');

    await obtenerHabitaciones('oci-otel-test-001');
    await obtenerTorneos('oci-otel-test-001');
    await obtenerPeliculas('oci-otel-test-001');
    await guardarCache('llave', { a: 1 }, 'oci-otel-test-001', 300);
    await saveArtifact({
      traceId: 'oci-otel-test-001',
      origen: 'hotel',
      habitacion: { id: 1 },
      torneo: { id: 2 },
      pelicula: { id: 3 },
    });

    expect(llamadas.length).toBeGreaterThan(0);

    for (const llamada of llamadas) {
      expect(llamada.headers['x-trace-id']).toBe('oci-otel-test-001');
    }

    expect(
      llamadas.some((llamada) => llamada.url.includes('/api/v2/huesped/4')),
    ).toBe(true);
    expect(
      llamadas.some((llamada) => llamada.url.includes('/api/v2/jugadores/4')),
    ).toBe(true);
    expect(
      llamadas.some((llamada) => llamada.url.includes('/api/v2/habitacion')),
    ).toBe(true);
    expect(llamadas.some((llamada) => llamada.url.includes('/peliculas'))).toBe(
      true,
    );
    expect(llamadas.some((llamada) => llamada.url.includes('/torneos'))).toBe(
      true,
    );
    expect(llamadas.some((llamada) => llamada.url.includes('/cache'))).toBe(
      true,
    );
    expect(
      llamadas.some((llamada) => llamada.url.includes('/api/v2/artifacts')),
    ).toBe(true);

    const artifact = llamadas.find((llamada) =>
      llamada.url.includes('/api/v2/artifacts'),
    );
    expect(artifact?.headers['x-trace-id']).toBe('oci-otel-test-001');

    await app.close();
  });
});
