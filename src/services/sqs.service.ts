import {
  SQSClient,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';

const sqs = new SQSClient({
  region: process.env.AWS_REGION || 'us-east-2',
});

const queueUrl =
  process.env.SQS_QUEUE_URL ||
  'https://sqs.us-east-2.amazonaws.com/837465732903/hotel-queue';

export async function enviarMensajeSQS(
  mensaje: Record<string, unknown>,
): Promise<void> {
  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(mensaje),
  });

  await sqs.send(command);
}