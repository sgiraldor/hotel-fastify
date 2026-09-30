export {};

declare global {
  var __ociQueue: {
    putMessages: import('vitest').Mock;
    getMessages: import('vitest').Mock;
    deleteMessage: import('vitest').Mock;
    getStats: import('vitest').Mock;
  };
}
