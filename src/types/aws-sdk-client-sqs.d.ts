declare module '@aws-sdk/client-sqs' {
  export class SQSClient {
    constructor(config?: { region?: string });
    send(command: unknown): Promise<unknown>;
  }

  export class SendMessageCommand {
    constructor(input: { QueueUrl: string; MessageBody: string });
  }
}
