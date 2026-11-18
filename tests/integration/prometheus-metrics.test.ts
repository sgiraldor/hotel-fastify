import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { registrarPrometheus } from '../../src/observability/prometheus-metrics';

describe('GET /metrics/prometheus', () => {
  it('expone texto prometheus sin romper JSON /metrics', async () => {
    const app = Fastify({ logger: false });
    registrarPrometheus(app);
    app.get('/ping', async () => ({ ok: true }));

    await app.inject({ method: 'GET', url: '/ping' });
    const respuesta = await app.inject({
      method: 'GET',
      url: '/metrics/prometheus',
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.headers['content-type']).toContain('text/plain');
    expect(respuesta.body).toContain('hotel_http_requests_total');
    expect(respuesta.body).toContain('hotel_http_p95_ms');
    await app.close();
  });
});
