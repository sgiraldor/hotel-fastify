import { afterAll, describe, expect, it } from 'vitest';
import { metrics, propagation, SpanKind, trace } from '@opentelemetry/api';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace';
import Fastify from 'fastify';
import { traceIdHook } from '../../src/plugins/trace-id.plugin';
import { asegurarSpansDeServidorHttp } from '../../src/observability/http-instrumentation';

const exportador = new InMemorySpanExporter();
const instrumentacionHttp = new HttpInstrumentation();
const sdk = new NodeSDK({
  serviceName: 'hotel-api',
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

describe('W3C entrante en Hotel', () => {
  afterAll(async () => {
    await sdk.shutdown();
    trace.disable();
    metrics.disable();
    propagation.disable();
  });

  it('continua el traceparent y responde el x-trace-id', async () => {
    const app = Fastify({ logger: false });
    app.addHook('onRequest', traceIdHook);
    app.get('/api/v2/echo', async () => ({ ok: true }));
    await app.listen({ port: 0, host: '127.0.0.1' });

    const direccion = app.server.address();
    const puerto =
      typeof direccion === 'object' && direccion ? direccion.port : 0;

    await trace.getTracer('hotel-api-test').startActiveSpan(
      'cliente-entrante',
      async (span) => {
        const respuesta = await fetch(
          `http://127.0.0.1:${puerto}/api/v2/echo`,
          { headers: { 'x-trace-id': 'oci-otel-test-001' } },
        );

        expect(respuesta.status).toBe(200);
        expect(respuesta.headers.get('x-trace-id')).toBe('oci-otel-test-001');

        const servidor = exportador
          .getFinishedSpans()
          .find((item) => item.kind === SpanKind.SERVER);
        const cliente = exportador
          .getFinishedSpans()
          .find((item) => item.kind === SpanKind.CLIENT);

        expect(servidor?.spanContext().traceId).toBe(span.spanContext().traceId);
        expect(cliente?.spanContext().traceId).toBe(span.spanContext().traceId);
        expect(servidor?.parentSpanContext?.spanId).toBe(
          cliente?.spanContext().spanId,
        );
        expect(servidor?.spanContext().spanId).not.toBe(
          cliente?.spanContext().spanId,
        );
        expect(servidor?.spanContext().traceId).not.toBe('oci-otel-test-001');
        span.end();
      },
    );

    await app.close();
  });
});
