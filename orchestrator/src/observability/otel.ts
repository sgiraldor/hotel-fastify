import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { NoopSpanProcessor } from '@opentelemetry/sdk-trace';
import { asegurarSpansDeServidorHttp } from './http-instrumentation';
import {
  exportacionDeMetricasConfigurada,
  exportacionDeTrazasConfigurada,
} from './otlp-config';

const MARCA = Symbol.for('hotel-orchestrator.otel');

function iniciar(): void {
  const globalConMarca = globalThis as typeof globalThis & {
    [MARCA]?: boolean;
  };

  if (globalConMarca[MARCA]) {
    return;
  }

  globalConMarca[MARCA] = true;

  const serviceName =
    process.env.OTEL_SERVICE_NAME?.trim() || 'hotel-orchestrator';

  const instrumentacionHttp = new HttpInstrumentation();

  const sdk = new NodeSDK({
    serviceName,
    autoDetectResources: false,
    instrumentations: [
      instrumentacionHttp,
      new UndiciInstrumentation(),
    ],
    logRecordProcessors: [],
    ...(exportacionDeTrazasConfigurada()
      ? {}
      : { spanProcessors: [new NoopSpanProcessor()] }),
    ...(exportacionDeMetricasConfigurada()
      ? {}
      : { metricReaders: [] }),
  });

  try {
    sdk.start();
    asegurarSpansDeServidorHttp(instrumentacionHttp);
  } catch {
    console.error(
      'OpenTelemetry no pudo iniciar. El servicio continua sin exportar telemetria.',
    );
  }
}

iniciar();
