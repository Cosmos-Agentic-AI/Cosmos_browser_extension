// Minimal chrome API stubs for Vitest (browser-extension environment).
// Only the methods actually called in unit tests are stubbed.
const chromeMock = {
  storage: {
    local: {
      get: async (_key: string) => ({}),
      set: async () => {},
    },
  },
  tabs: {
    captureVisibleTab: async () => "data:image/png;base64,",
    sendMessage: async () => ({ ok: true, data: null }),
  },
  windows: { WINDOW_ID_CURRENT: -2 },
  runtime: {
    connect: () => ({ postMessage: () => {}, onMessage: { addListener: () => {} }, onDisconnect: { addListener: () => {} } }),
    sendMessage: async () => {},
  },
};

(globalThis as unknown as Record<string, unknown>).chrome = chromeMock;
