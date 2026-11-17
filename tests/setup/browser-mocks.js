import { vi } from "vitest";

export function createPopupMock(overrides = {}) {
  return {
    closed: false,
    focus: vi.fn(),
    close: vi.fn(function close() {
      this.closed = true;
    }),
    ...overrides,
  };
}

export function installWindowMocks(window, { xrm, popup = createPopupMock() } = {}) {
  Object.defineProperty(window, "parent", {
    configurable: true,
    value: { Xrm: xrm },
  });
  window.Xrm = xrm;
  window.open = vi.fn(() => popup);
  Object.defineProperty(window.screen, "availWidth", { configurable: true, value: 1440 });
  Object.defineProperty(window.screen, "availHeight", { configurable: true, value: 900 });
  return { popup, open: window.open };
}