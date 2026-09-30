import * as common from 'oci-common';
import * as queue from 'oci-queue';
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';

// ----------------------------------------------------
// AUTENTICACION OCI
// ----------------------------------------------------

function crearProveedorAutenticacion() {

  // El modo de autenticacion se controla explicitamente
  // mediante la variable OCI_AUTH_MODE.
  //
  // config   -> archivo config + llave privada
  // workload -> OKE Workload Identity
  //
  // Por defecto usamos config.
  const authMode =
    process.env.OCI_AUTH_MODE || 'config';

  if (authMode === 'workload') {

    console.log(
      'OCI Auth: usando OKE Workload Identity'
    );

    return common
      .OkeWorkloadIdentityAuthenticationDetailsProvider
      .builder(
        '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt',
        '/var/run/secrets/kubernetes.io/serviceaccount/token'
      );
  }

  // --------------------------------------------------
  // AUTENTICACION POR ARCHIVO DE CONFIGURACION
  // --------------------------------------------------

  const configFile =
    process.env.OCI_CONFIG_FILE ||
    `${process.env.USERPROFILE}\\.oci\\config`;

  const profile =
    process.env.OCI_CONFIG_PROFILE || 'DEFAULT';

  console.log(
    'OCI Auth: usando archivo de configuracion'
  );

  return new common.ConfigFileAuthenticationDetailsProvider(
    configFile,
    profile
  );
}

const provider = crearProveedorAutenticacion();

const client = new queue.QueueClient({
  authenticationDetailsProvider: provider,
});

if (process.env.OCI_QUEUE_ENDPOINT) {
  client.endpoint = process.env.OCI_QUEUE_ENDPOINT;
}


// ----------------------------------------------------
// ESTRUCTURA DEL MENSAJE
// ----------------------------------------------------

export interface QueueMessage {
  traceId: string;
  tipo: string;
  origen: string;
  data: unknown;
  timestamp: string;
  otel?: Record<string, string>;
}


// ----------------------------------------------------
// PUBLICAR MENSAJE
// ----------------------------------------------------

export async function publicarMensaje(
  mensaje: QueueMessage
) {

  const queueId = process.env.OCI_QUEUE_OCID;

  if (!queueId) {
    throw new Error(
      'OCI_QUEUE_OCID no esta configurado'
    );
  }

  // MessageMetadata.customProperties existe en oci-queue 2.142,
  // pero channelId es obligatorio. Publicar un channelId cambiaria
  // el canal del mensaje. El contexto W3C viaja en el JSON, en
  // otel, sin quitar los campos funcionales. propagation.inject
  // escribe traceparent y tracestate; no se arma el header a mano.
  return trace.getTracer('hotel-orchestrator').startActiveSpan(
    'publish oci-queue',
    {
      kind: SpanKind.PRODUCER,
      attributes: {
        'messaging.system': 'oci_queue',
        'messaging.operation.type': 'publish',
        'messaging.destination.name': 'oci-queue',
      },
    },
    async (span) => {
      try {
        const carrier: Record<string, string> = {};
        propagation.inject(context.active(), carrier);

        const request: queue.requests.PutMessagesRequest = {
          queueId,
          putMessagesDetails: {
            messages: [
              {
                content: JSON.stringify({
                  ...mensaje,
                  otel: carrier,
                }),
              },
            ],
          },
        };

        const response = await client.putMessages(request);
        span.setStatus({ code: SpanStatusCode.OK });
        return response;
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
}


// ----------------------------------------------------
// OBTENER MENSAJES
// ----------------------------------------------------

export async function obtenerMensajes() {

  const queueId = process.env.OCI_QUEUE_OCID;

  if (!queueId) {
    throw new Error(
      'OCI_QUEUE_OCID no esta configurado'
    );
  }

  const request: queue.requests.GetMessagesRequest = {
    queueId,

    // El mensaje queda oculto temporalmente mientras
    // nuestro consumidor intenta procesarlo.
    visibilityInSeconds: 30,

    // Long polling.
    timeoutInSeconds: 10,

    // Procesaremos pocos mensajes por solicitud.
    limit: 5,
  };

  const response = await client.getMessages(request);

  return response.getMessages.messages;
}


// ----------------------------------------------------
// ELIMINAR MENSAJE PROCESADO
// ----------------------------------------------------

export async function eliminarMensaje(
  messageReceipt: string
) {

  const queueId = process.env.OCI_QUEUE_OCID;

  if (!queueId) {
    throw new Error(
      'OCI_QUEUE_OCID no esta configurado'
    );
  }

  const request: queue.requests.DeleteMessageRequest = {
    queueId,
    messageReceipt,
  };

  await client.deleteMessage(request);
}


// ----------------------------------------------------
// MENSAJES PENDIENTES SEGUN OCI GetStats
// visibleMessages + inFlightMessages.
// null si no hay OCID o la API no responde: no se inventa 0.
// ----------------------------------------------------

export async function consultarMensajesPendientes(): Promise<number | null> {
  const queueId = process.env.OCI_QUEUE_OCID;

  if (!queueId) {
    return null;
  }

  try {
    const response = await client.getStats({ queueId });
    const stats = response.queueStats?.queue;

    if (
      !stats ||
      typeof stats.visibleMessages !== 'number' ||
      typeof stats.inFlightMessages !== 'number'
    ) {
      return null;
    }

    return stats.visibleMessages + stats.inFlightMessages;
  } catch {
    console.error(
      'No se pudo leer GetStats de OCI Queue',
    );
    return null;
  }
}