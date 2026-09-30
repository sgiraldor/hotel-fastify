import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  context,
  metrics,
  propagation,
  SpanKind,
  trace,
} from '@opentelemetry/api';
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace';
import {
  consultarMensajesPendientes,
  publicarMensaje,
} from '../src/clients/queue.client';
import { consumirMensajes } from '../src/services/queue-consumer.service';
import { iniciarGaugePendiente } from '../src/observability/queue-metrics';

const exportadorSpans = new InMemorySpanExporter();
const exportadorMetricas = new InMemoryMetricExporter(
  AggregationTemporality.CUMULATIVE,
);
const lectorMetricas = new PeriodicExportingMetricReader({
  exporter: exportadorMetricas,
  exportIntervalMillis: 60000,
});

const sdk = new NodeSDK({
  serviceName: 'hotel-orchestrator',
  autoDetectResources: false,
  spanProcessors: [new SimpleSpanProcessor({ exporter: exportadorSpans })],
  metricReaders: [],
  logRecordProcessors: [],
  instrumentations: [],
});

function mensaje(parcial: {
  traceId: string;
  otel?: Record<string, string>;
  deliveryCount: number;
  receipt?: string;
  content?: string;
}) {
  return {
    id: 1,
    content:
      parcial.content ??
      JSON.stringify({
        traceId: parcial.traceId,
        tipo: 'flujo-orquestado',
        origen: 'hotel',
        data: { ok: true },
        timestamp: '2026-01-01T00:00:00.000Z',
        ...(parcial.otel ? { otel: parcial.otel } : {}),
      }),
    receipt: parcial.receipt,
    deliveryCount: parcial.deliveryCount,
  };
}

describe('OCI Queue y OpenTelemetry', () => {
  beforeAll(() => {
    sdk.start();
    metrics.setGlobalMeterProvider(
      new MeterProvider({ readers: [lectorMetricas] }),
    );
  });

  afterAll(async () => {
    await sdk.shutdown();
    trace.disable();
    metrics.disable();
    propagation.disable();
  });

  it('inyecta el contexto con propagation.inject y conserva el x-trace-id', async () => {
    globalThis.__ociQueue.putMessages.mockResolvedValue({
      putMessages: { messages: [{ id: 10 }] },
    });

    await trace.getTracer('test').startActiveSpan('padre', async (span) => {
      await publicarMensaje({
        traceId: 'oci-otel-test-001',
        tipo: 'flujo-orquestado',
        origen: 'hotel',
        data: { habitacion: 1 },
        timestamp: '2026-01-01T00:00:00.000Z',
      });
      span.end();
    });

    const solicitud = globalThis.__ociQueue.putMessages.mock.calls[0][0];
    const cuerpo = JSON.parse(
      solicitud.putMessagesDetails.messages[0].content,
    );
    const productor = exportadorSpans
      .getFinishedSpans()
      .find((span) => span.name === 'publish oci-queue');

    expect(cuerpo.traceId).toBe('oci-otel-test-001');
    expect(cuerpo.tipo).toBe('flujo-orquestado');
    expect(cuerpo.origen).toBe('hotel');
    expect(cuerpo.data).toEqual({ habitacion: 1 });
    expect(cuerpo.timestamp).toBe('2026-01-01T00:00:00.000Z');
    expect(cuerpo.otel.traceparent).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/,
    );
    expect(cuerpo.otel.traceparent).toContain(
      productor?.spanContext().traceId,
    );
    expect(cuerpo.otel.traceparent).toContain(
      productor?.spanContext().spanId,
    );
    expect(cuerpo.otel.traceparent).not.toContain('oci-otel-test-001');
    expect(productor?.kind).toBe(SpanKind.PRODUCER);
    expect(solicitud.putMessagesDetails.messages[0].metadata).toBeUndefined();
  });

  it('el consumidor extrae el contexto y borra el mensaje si tuvo exito', async () => {
    exportadorSpans.reset();

    const carrier: Record<string, string> = {};

    await trace
      .getTracer('test')
      .startActiveSpan('publicacion', async (span) => {
        propagation.inject(context.active(), carrier);

        globalThis.__ociQueue.getMessages.mockResolvedValue({
          getMessages: {
            messages: [
              mensaje({
                traceId: 'func-queue-1',
                otel: carrier,
                deliveryCount: 1,
                receipt: 'receipt-ok',
              }),
            ],
          },
        });
        globalThis.__ociQueue.deleteMessage.mockResolvedValue({});

        await consumirMensajes();
        span.end();

        const consumidor = exportadorSpans
          .getFinishedSpans()
          .find((item) => item.name === 'process oci-queue');

        expect(consumidor?.kind).toBe(SpanKind.CONSUMER);
        expect(consumidor?.spanContext().traceId).toBe(
          span.spanContext().traceId,
        );
        expect(consumidor?.parentSpanContext?.spanId).toBe(
          span.spanContext().spanId,
        );
        expect(consumidor?.spanContext().spanId).not.toBe(
          span.spanContext().spanId,
        );
        expect(consumidor?.attributes['x.trace_id']).toBe('func-queue-1');
      });

    expect(globalThis.__ociQueue.deleteMessage).toHaveBeenCalledWith(
      expect.objectContaining({ messageReceipt: 'receipt-ok' }),
    );
  });

  it('no elimina el mensaje cuando el procesamiento falla', async () => {
    globalThis.__ociQueue.getMessages.mockResolvedValue({
      getMessages: {
        messages: [
          {
            id: 2,
            content: '{',
            receipt: 'receipt-malo',
            deliveryCount: 1,
          },
        ],
      },
    });

    const resultado = await consumirMensajes();

    expect(resultado.fallidos).toBe(1);
    expect(resultado.procesados).toBe(0);
    expect(globalThis.__ociQueue.deleteMessage).not.toHaveBeenCalled();
  });

  it('un reproceso conserva el x-trace-id y abre otro span', async () => {
    exportadorSpans.reset();
    const carrier: Record<string, string> = {};

    await trace
      .getTracer('test')
      .startActiveSpan('publicacion', async (span) => {
        propagation.inject(context.active(), carrier);

        globalThis.__ociQueue.getMessages.mockResolvedValue({
          getMessages: {
            messages: [
              mensaje({
                traceId: 'func-queue-1',
                otel: carrier,
                deliveryCount: 2,
                receipt: 'receipt-retry',
              }),
            ],
          },
        });
        globalThis.__ociQueue.deleteMessage.mockResolvedValue({});

        await consumirMensajes();
        span.end();

        const consumidor = exportadorSpans
          .getFinishedSpans()
          .find((item) => item.name === 'process oci-queue');

        expect(consumidor?.attributes['x.trace_id']).toBe('func-queue-1');
        expect(consumidor?.attributes['messaging.oci.delivery_count']).toBe(2);
        expect(consumidor?.spanContext().spanId).not.toBe(
          span.spanContext().spanId,
        );
        expect(consumidor?.spanContext().traceId).toBe(
          span.spanContext().traceId,
        );
        expect(consumidor?.links[0]?.context.spanId).toBe(
          span.spanContext().spanId,
        );
      });

    await lectorMetricas.forceFlush();
    const texto = JSON.stringify(exportadorMetricas.getMetrics());
    expect(texto).toContain('queue.messages.reprocessed');
  });

  it('lee pending desde GetStats y no fabrica un valor si OCI falla', async () => {
    globalThis.__ociQueue.getStats.mockResolvedValue({
      queueStats: {
        queue: {
          visibleMessages: 2,
          inFlightMessages: 3,
          sizeInBytes: 10,
        },
        dlq: {
          visibleMessages: 9,
          inFlightMessages: 0,
          sizeInBytes: 0,
        },
      },
    });

    expect(await consultarMensajesPendientes()).toBe(5);

    globalThis.__ociQueue.getStats.mockRejectedValue(new Error('oci'));
    expect(await consultarMensajesPendientes()).toBeNull();

    globalThis.__ociQueue.getStats.mockResolvedValue({
      queueStats: {
        queue: {
          visibleMessages: 4,
          inFlightMessages: 1,
          sizeInBytes: 1,
        },
        dlq: {
          visibleMessages: 0,
          inFlightMessages: 0,
          sizeInBytes: 0,
        },
      },
    });

    iniciarGaugePendiente();
    await lectorMetricas.forceFlush();

    const texto = JSON.stringify(exportadorMetricas.getMetrics());
    expect(texto).toContain('queue.messages.pending');
  });
});
