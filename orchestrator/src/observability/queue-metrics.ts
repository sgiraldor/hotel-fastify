import { metrics } from '@opentelemetry/api';
import { consultarMensajesPendientes } from '../clients/queue.client';

export const METRIC_QUEUE_REPROCESSED = 'queue.messages.reprocessed';
export const METRIC_QUEUE_PENDING = 'queue.messages.pending';

let reprocesados: ReturnType<
  ReturnType<typeof metrics.getMeter>['createCounter']
> | undefined;

let gaugeIniciado = false;

export function registrarReprocesado(): void {
  if (!reprocesados) {
    reprocesados = metrics
      .getMeter('hotel-orchestrator')
      .createCounter(METRIC_QUEUE_REPROCESSED, {
        description:
          'Mensajes de OCI Queue cuyo deliveryCount indica una reentrega',
      });
  }

  reprocesados.add(1);
}

export function iniciarGaugePendiente(): void {
  if (gaugeIniciado || !process.env.OCI_QUEUE_OCID) {
    return;
  }

  gaugeIniciado = true;

  const gauge = metrics
    .getMeter('hotel-orchestrator')
    .createObservableGauge(METRIC_QUEUE_PENDING, {
      description:
        'Mensajes aun no eliminados segun OCI GetStats: visibleMessages + inFlightMessages',
    });

  gauge.addCallback(async (resultado) => {
    const pendientes = await consultarMensajesPendientes();

    if (pendientes === null) {
      return;
    }

    resultado.observe(pendientes);
  });
}
