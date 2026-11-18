import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'orchestrator/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/server.ts',
        'src/config/**',
        'src/entities/**',
        'src/observability/otel.ts',
        'src/observability/http-instrumentation.ts',
        'src/observability/http-metrics.ts',
        'src/observability/log-context.ts',
        'src/observability/metrics.ts',
        'src/routes/health.routes.ts',
      ],
      reporter: ['text', 'html'],

      thresholds: {
        statements: 60,
        branches: 60,
        functions: 60,
        lines: 60,
      },
    },
  },
});