import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import * as http from 'node:http';
import * as https from 'node:https';

interface ParcheHttp {
  _wrap: (
    objetivo: object,
    metodo: string,
    envoltorio: (original: (...args: unknown[]) => unknown) => unknown,
  ) => unknown;
  _getPatchIncomingRequestFunction: (
    componente: string,
  ) => (original: (...args: unknown[]) => unknown) => unknown;
}

function yaTrazaEntrantes(emitir: unknown): boolean {
  return String(emitir).includes('incomingRequest');
}

export function asegurarSpansDeServidorHttp(
  instrumentacion: HttpInstrumentation,
): void {
  const parche = instrumentacion as unknown as ParcheHttp;

  if (!yaTrazaEntrantes(http.Server.prototype.emit)) {
    parche._wrap(
      http.Server.prototype,
      'emit',
      parche._getPatchIncomingRequestFunction('http'),
    );
  }

  if (
    https.Server !== http.Server &&
    !yaTrazaEntrantes(https.Server.prototype.emit)
  ) {
    parche._wrap(
      https.Server.prototype,
      'emit',
      parche._getPatchIncomingRequestFunction('https'),
    );
  }
}
