import { context, trace } from '@opentelemetry/api';
import { almacenamientoTrazaFuncional } from '../plugins/trace-id.plugin';

export function camposDeCorrelacion(): Record<string, string> {
  const campos: Record<string, string> = {};
  const funcional = almacenamientoTrazaFuncional.getStore();

  if (funcional?.xTraceId) {
    campos.xTraceId = funcional.xTraceId;
  }

  const contexto = trace.getSpan(context.active())?.spanContext();

  if (contexto?.traceId) {
    campos.otelTraceId = contexto.traceId;
    campos.otelSpanId = contexto.spanId;
  }

  return campos;
}
