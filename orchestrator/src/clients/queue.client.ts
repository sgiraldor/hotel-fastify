import * as common from 'oci-common';
import * as queue from 'oci-queue';

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