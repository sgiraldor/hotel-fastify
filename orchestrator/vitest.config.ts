import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false,
    env: {
      STORAGE_API_URL: 'http://127.0.0.1:9',
      OCI_QUEUE_OCID: 'ocid1.queue.oc1..unit-test',
      OCI_AUTH_MODE: 'config',
    },
  },
});
