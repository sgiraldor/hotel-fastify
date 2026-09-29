import * as common from 'oci-common';
import * as queue from 'oci-queue';

const configFile =
  process.env.OCI_CONFIG_FILE ||
  `${process.env.USERPROFILE}\\.oci\\config`;

const profile =
  process.env.OCI_CONFIG_PROFILE || 'DEFAULT';

const provider =
  new common.ConfigFileAuthenticationDetailsProvider(
    configFile,
    profile
  );

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

  const request: queue.requests.PutMessagesRequest = {
    queueId,
    putMessagesDetails: {
      messages: [
        {
          content: JSON.stringify(mensaje),
        },
      ],
    },
  };

  const response = await client.putMessages(request);

  return response;
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