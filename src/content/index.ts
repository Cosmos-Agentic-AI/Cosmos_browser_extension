import { readPage } from "@modules/dom-reader/domReader";
import { executeContentAction } from "@modules/browser-controller/contentActions";
import { BrowserAction } from "@shared/types/actions";

console.info("[Cosmos] content script loaded on", window.location.href);

interface ContentRequest {
  kind: "DOM_READ" | "EXECUTE_ACTION" | "WAIT_FOR_SETTLE" | "DOM_FINGERPRINT";
  action?: BrowserAction;
  timeoutMs?: number;
}

/**
 * Waits until the DOM stops mutating for `quietMs` ms, or `timeoutMs` has elapsed.
 * Resolves with the number of mutations observed. This catches SPA renders that
 * happen asynchronously after a click or navigation.
 */
function waitForDomSettle(quietMs = 400, timeoutMs = 3000): Promise<number> {
  return new Promise((resolve) => {
    let mutations = 0;
    let quietTimer: ReturnType<typeof setTimeout>;

    const done = () => {
      observer.disconnect();
      clearTimeout(quietTimer);
      resolve(mutations);
    };

    const resetQuiet = () => {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(done, quietMs);
    };

    const observer = new MutationObserver((records) => {
      mutations += records.length;
      resetQuiet();
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    resetQuiet(); // start the quiet timer even if no mutations fire
    setTimeout(done, timeoutMs); // hard cap
  });
}

/** Cheap state fingerprint for detecting whether an action changed the page. */
function domFingerprint(): string {
  const url = window.location.href;
  const text = (document.body?.innerText ?? "").slice(0, 300);
  const inputs = Array.from(document.querySelectorAll("input,textarea,select"))
    .slice(0, 20)
    .map((el) => (el as HTMLInputElement).value ?? "")
    .join("|");
  return `${url}::${text}::${inputs}`;
}

chrome.runtime.onMessage.addListener((message: ContentRequest, _sender, sendResponse) => {
  if (message.kind === "DOM_READ") {
    try {
      sendResponse({ ok: true, data: readPage() });
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
    return false;
  }

  if (message.kind === "WAIT_FOR_SETTLE") {
    waitForDomSettle(400, message.timeoutMs ?? 3000)
      .then((n) => sendResponse({ ok: true, data: { mutations: n } }))
      .catch(() => sendResponse({ ok: true, data: { mutations: 0 } }));
    return true;
  }

  if (message.kind === "DOM_FINGERPRINT") {
    sendResponse({ ok: true, data: { fingerprint: domFingerprint() } });
    return false;
  }

  if (message.kind === "EXECUTE_ACTION" && message.action) {
    executeContentAction(message.action)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error: unknown) =>
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      );
    return true;
  }

  return false;
});

export {};
