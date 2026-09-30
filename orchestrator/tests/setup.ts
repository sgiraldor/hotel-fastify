import { beforeEach, vi } from 'vitest';

const oci = vi.hoisted(() => ({
  putMessages: vi.fn(),
  getMessages: vi.fn(),
  deleteMessage: vi.fn(),
  getStats: vi.fn(),
}));

vi.mock('oci-common', () => ({
  ConfigFileAuthenticationDetailsProvider: class {
    constructor(_archivo?: string, _perfil?: string) {}
  },
  OkeWorkloadIdentityAuthenticationDetailsProvider: {
    builder() {
      return {};
    },
  },
}));

vi.mock('oci-queue', () => ({
  QueueClient: class {
    endpoint = '';

    constructor(_opciones?: unknown) {}

    putMessages(request: unknown) {
      return oci.putMessages(request);
    }

    getMessages(request: unknown) {
      return oci.getMessages(request);
    }

    deleteMessage(request: unknown) {
      return oci.deleteMessage(request);
    }

    getStats(request: unknown) {
      return oci.getStats(request);
    }
  },
}));

globalThis.__ociQueue = oci;

beforeEach(() => {
  oci.putMessages.mockReset();
  oci.getMessages.mockReset();
  oci.deleteMessage.mockReset();
  oci.getStats.mockReset();
});
