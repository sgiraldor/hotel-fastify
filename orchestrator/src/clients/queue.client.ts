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

export interface QueueMessage {
  traceId: string;
  tipo: string;
  origen: string;
  data: unknown;
  timestamp: string;
}

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