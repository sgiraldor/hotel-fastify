import { afterEach, describe, expect, it } from 'vitest';
import {
  exportacionDeMetricasConfigurada,
  exportacionDeTrazasConfigurada,
} from '../../src/observability/otlp-config';

const variables = [
  'OTEL_TRACES_EXPORTER',
  'OTEL_METRICS_EXPORTER',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT',
  'OTEL_EXPORTER_OTLP_METRICS_ENDPOINT',
];

describe('configuracion OTLP de Hotel', () => {
  const respaldo = new Map<string, string | undefined>();

  afterEach(() => {
    for (const variable of variables) {
      const valor = respaldo.get(variable);
      if (valor === undefined) {
        delete process.env[variable];
      } else {
        process.env[variable] = valor;
      }
    }
    respaldo.clear();
  });

  function limpiar() {
    for (const variable of variables) {
      respaldo.set(variable, process.env[variable]);
      delete process.env[variable];
    }
  }

  it('no exporta cuando no hay endpoint', () => {
    limpiar();
    expect(exportacionDeTrazasConfigurada()).toBe(false);
    expect(exportacionDeMetricasConfigurada()).toBe(false);
  });

  it('respeta el endpoint y el valor none', () => {
    limpiar();
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = 'https://otlp.example/v1/traces';
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT =
      'https://otlp.example/v1/metrics';
    expect(exportacionDeTrazasConfigurada()).toBe(true);
    expect(exportacionDeMetricasConfigurada()).toBe(true);

    process.env.OTEL_TRACES_EXPORTER = 'none';
    process.env.OTEL_METRICS_EXPORTER = 'none';
    expect(exportacionDeTrazasConfigurada()).toBe(false);
    expect(exportacionDeMetricasConfigurada()).toBe(false);
  });
});
