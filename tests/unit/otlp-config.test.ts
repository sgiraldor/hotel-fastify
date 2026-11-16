import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  exportacionDeMetricasConfigurada,
  exportacionDeTrazasConfigurada,
} from '../../src/observability/otlp-config';

const claves = [
  'OTEL_TRACES_EXPORTER',
  'OTEL_METRICS_EXPORTER',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT',
  'OTEL_EXPORTER_OTLP_METRICS_ENDPOINT',
];

describe('otlp-config', () => {
  const backup: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const clave of claves) {
      backup[clave] = process.env[clave];
      delete process.env[clave];
    }
  });

  afterEach(() => {
    for (const clave of claves) {
      if (backup[clave] === undefined) {
        delete process.env[clave];
      } else {
        process.env[clave] = backup[clave];
      }
    }
  });

  it('no exporta trazas si no hay endpoint', () => {
    expect(exportacionDeTrazasConfigurada()).toBe(false);
  });

  it('exporta trazas cuando hay OTEL_EXPORTER_OTLP_ENDPOINT', () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
    expect(exportacionDeTrazasConfigurada()).toBe(true);
  });

  it('respeta OTEL_TRACES_EXPORTER=none', () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
    process.env.OTEL_TRACES_EXPORTER = 'none';
    expect(exportacionDeTrazasConfigurada()).toBe(false);
  });

  it('exporta metricas con endpoint dedicado', () => {
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT =
      'http://localhost:4318/v1/metrics';
    expect(exportacionDeMetricasConfigurada()).toBe(true);
  });
});
