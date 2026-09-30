import { afterAll, describe, expect, it } from 'vitest';
import { SpanKind, trace, propagation, metrics } from '@opentelemetry/api';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { traceIdHook as traceIdHotel } from '../../src/plugins/trace-id.plugin';
import { asegurarSpansDeServidorHttp } from '../src/observability/http-instrumentation';

const exportador = new InMemorySpanExporter();
const instrumentacionHttp = new HttpInstrumentation();
const sdk = new NodeSDK({
  serviceName: 'hotel-orchestrator',
  autoDetectResources: false,
  spanProcessors: [new SimpleSpanProcessor({ exporter: exportador })],
  metricReaders: [],
  logRecordProcessors: [],
  instrumentations: [
    instrumentacionHttp,
    new UndiciInstrumentation(),
  ],
});

sdk.start();
asegurarSpansDeServidorHttp(instrumentacionHttp);

function ruta(span: { attributes: Record<string, unknown>; name: string }) {
  return String(
    span.attributes['url.path'] ??
      span.attributes['url.full'] ??
      span.name,
  );
}

describe('Orchestrator hacia Hotel', () => {
  const servidores: FastifyInstance[] = [];

  afterAll(async () => {
    await Promise.all(servidores.map((servidor) => servidor.close()));
    await sdk.shutdown();
    trace.disable();
    metrics.disable();
    propagation.disable();
  });

  it('comparte x-trace-id y otelTraceId con spanId distintos y traceparent real', async () => {
    const capturado: { headers: Record<string, unknown>; respuesta?: unknown } =
      { headers: {} };

    const hotel = Fastify({ logger: false });
    servidores.push(hotel);
    hotel.addHook('onRequest', traceIdHotel);
    hotel.get('/api/v2/huesped/:id', async (request, reply) => {
      capturado.headers = request.headers;
      capturado.respuesta = reply.getHeader('x-trace-id');
      return { id: Number((request.params as { id: string }).id) };
    });
    await hotel.listen({ port: 0, host: '127.0.0.1' });
    const direccionHotel = hotel.server.address();
    const puertoHotel =
      typeof direccionHotel === 'object' && direccionHotel
        ? direccionHotel.port
        : 0;

    process.env.HOTEL_API_URL = `http://127.0.0.1:${puertoHotel}`;

    const { hotelRoutes } = await import('../src/routes/hotel.routes');
    const { traceIdHook } = await import('../src/plugins/trace-id.plugin');

    const orquestador = Fastify({ logger: false });
    servidores.push(orquestador);
    orquestador.addHook('onRequest', traceIdHook);
    await orquestador.register(hotelRoutes);
    await orquestador.listen({ port: 0, host: '127.0.0.1' });
    const direccionOrquestador = orquestador.server.address();
    const puertoOrquestador =
      typeof direccionOrquestador === 'object' && direccionOrquestador
        ? direccionOrquestador.port
        : 0;

    const respuesta = await fetch(
      `http://127.0.0.1:${puertoOrquestador}/api/v2/hotel/huesped/7`,
      { headers: { 'x-trace-id': 'oci-otel-test-001' } },
    );

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('x-trace-id')).toBe('oci-otel-test-001');
    expect(capturado.headers['x-trace-id']).toBe('oci-otel-test-001');
    expect(capturado.respuesta).toBe('oci-otel-test-001');

    const traceparent = String(capturado.headers.traceparent);
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);

    const spans = exportador.getFinishedSpans();
    const servidorOrquestador = spans.find(
      (span) =>
        span.kind === SpanKind.SERVER &&
        ruta(span).includes('/api/v2/hotel/huesped/7'),
    );
    const clienteHotel = spans.find(
      (span) =>
        span.kind === SpanKind.CLIENT &&
        ruta(span).includes('/api/v2/huesped/7'),
    );
    const servidorHotel = spans.find(
      (span) =>
        span.kind === SpanKind.SERVER &&
        ruta(span).includes('/api/v2/huesped/7') &&
        !ruta(span).includes('/api/v2/hotel/'),
    );

    expect(servidorOrquestador).toBeTruthy();
    expect(clienteHotel).toBeTruthy();
    expect(servidorHotel).toBeTruthy();

    const trazaOrquestador = servidorOrquestador!.spanContext().traceId;
    const trazaHotel = servidorHotel!.spanContext().traceId;

    expect(trazaHotel).toBe(trazaOrquestador);
    expect(clienteHotel!.spanContext().traceId).toBe(trazaOrquestador);
    expect(servidorHotel!.spanContext().spanId).not.toBe(
      servidorOrquestador!.spanContext().spanId,
    );
    expect(servidorHotel!.spanContext().spanId).not.toBe(
      clienteHotel!.spanContext().spanId,
    );
    expect(servidorHotel!.parentSpanContext?.spanId).toBe(
      clienteHotel!.spanContext().spanId,
    );
    expect(traceparent).toContain(clienteHotel!.spanContext().spanId);
    expect(traceparent).toContain(trazaHotel);
    expect(trazaHotel).not.toBe('oci-otel-test-001');

    process.stdout.write(
      JSON.stringify({
        evidencia: [
          {
            servicio: 'Orchestrator',
            xTraceId: 'oci-otel-test-001',
            otelTraceId: trazaOrquestador,
            spanId: servidorOrquestador!.spanContext().spanId,
          },
          {
            servicio: 'Hotel',
            xTraceId: String(capturado.headers['x-trace-id']),
            otelTraceId: trazaHotel,
            spanId: servidorHotel!.spanContext().spanId,
          },
        ],
      }) + '\n',
    );
  });
});
