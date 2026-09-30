import {
  context,
  propagation,
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  trace,
  isSpanContextValid,
} from '@opentelemetry/api';
import {
  obtenerMensajes,
  eliminarMensaje,
} from '../clients/queue.client';
import { registrarReprocesado } from '../observability/queue-metrics';


// ----------------------------------------------------
// CONSUMIR Y PROCESAR MENSAJES DE OCI QUEUE
//
// Cada intento abre un span CONSUMER nuevo. Su padre es el
// contexto devuelto por propagation.extract, asi que comparte
// otelTraceId con el productor y usa otro spanId.
// Si deliveryCount > 1, OCI reentrego el mismo mensaje: se
// conserva el x-trace-id del JSON y se agrega un link al
// contexto original. No es el mismo span del intento anterior.
// ----------------------------------------------------

export async function consumirMensajes() {

  const mensajes = await obtenerMensajes();

  if (!mensajes || mensajes.length === 0) {
    return {
      procesados: 0,
      message: 'No hay mensajes disponibles en la cola',
    };
  }

  let procesados = 0;
  let fallidos = 0;

  for (const mensaje of mensajes) {

    try {

      if (!mensaje.content) {
        throw new Error(
          'El mensaje no contiene contenido'
        );
      }

      const contenido = JSON.parse(mensaje.content);
      const traceIdFuncional =
        contenido &&
        typeof contenido === 'object' &&
        typeof contenido.traceId === 'string'
          ? contenido.traceId
          : undefined;

      const carrier =
        contenido &&
        typeof contenido === 'object' &&
        contenido.otel &&
        typeof contenido.otel === 'object'
          ? contenido.otel as Record<string, string>
          : {};

      const contextoExtraido = propagation.extract(
        ROOT_CONTEXT,
        carrier,
      );

      const contextoProductor = trace
        .getSpan(contextoExtraido)
        ?.spanContext();

      const redelivery =
        typeof mensaje.deliveryCount === 'number' &&
        mensaje.deliveryCount > 1;

      if (redelivery) {
        registrarReprocesado();
      }

      await context.with(contextoExtraido, async () => {
        await trace.getTracer('hotel-orchestrator').startActiveSpan(
          'process oci-queue',
          {
            kind: SpanKind.CONSUMER,
            links:
              redelivery &&
              contextoProductor &&
              isSpanContextValid(contextoProductor)
                ? [{ context: contextoProductor }]
                : [],
            attributes: {
              'messaging.system': 'oci_queue',
              'messaging.operation.type': 'process',
              'messaging.destination.name': 'oci-queue',
              ...(typeof mensaje.deliveryCount === 'number'
                ? {
                    'messaging.oci.delivery_count':
                      mensaje.deliveryCount,
                  }
                : {}),
              ...(traceIdFuncional
                ? { 'x.trace_id': traceIdFuncional }
                : {}),
            },
          },
          async (span) => {
            try {
              console.log(
                'Procesando mensaje:',
                contenido
              );

              const contextoSpan = span.spanContext();

              console.log({
                xTraceId: traceIdFuncional,
                otelTraceId: contextoSpan.traceId,
                otelSpanId: contextoSpan.spanId,
              });

              console.log(
                `Mensaje procesado. traceId: ${contenido.traceId}`
              );

              if (!mensaje.receipt) {
                throw new Error(
                  'El mensaje no contiene receipt'
                );
              }

              await eliminarMensaje(mensaje.receipt);

              procesados++;
              span.setStatus({ code: SpanStatusCode.OK });
            } catch (error) {
              if (error instanceof Error) {
                span.recordException(error);
              }
              span.setStatus({ code: SpanStatusCode.ERROR });
              throw error;
            } finally {
              span.end();
            }
          },
        );
      });

    } catch (error) {

      fallidos++;

      console.error(
        'Error procesando mensaje:',
        error
      );

      // Si ocurre un error, NO eliminamos el mensaje.
      // OCI podra entregarlo nuevamente y, si supera
      // el numero maximo de intentos, lo enviara a DLQ.
    }
  }

  return {
    recibidos: mensajes.length,
    procesados,
    fallidos,
  };
}
