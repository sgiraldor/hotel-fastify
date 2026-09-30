function valor(nombre: string): string {
  return process.env[nombre]?.trim() ?? '';
}

export function exportacionDeTrazasConfigurada(): boolean {
  const modo = valor('OTEL_TRACES_EXPORTER');

  if (modo === 'none') {
    return false;
  }

  if (modo !== '' && modo !== 'otlp') {
    return true;
  }

  return (
    valor('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT') !== '' ||
    valor('OTEL_EXPORTER_OTLP_ENDPOINT') !== ''
  );
}

export function exportacionDeMetricasConfigurada(): boolean {
  const modo = valor('OTEL_METRICS_EXPORTER');

  if (modo === 'none') {
    return false;
  }

  if (modo !== '' && modo !== 'otlp') {
    return true;
  }

  return (
    valor('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT') !== '' ||
    valor('OTEL_EXPORTER_OTLP_ENDPOINT') !== ''
  );
}
