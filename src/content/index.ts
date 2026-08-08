import { readPage } from "@modules/dom-reader/domReader";
import { executeContentAction } from "@modules/browser-controller/contentActions";
import { BrowserAction } from "@shared/types/actions";

// Cosmos content script.
// Listens for messages the Router forwards via chrome.tabs.sendMessage.
// This is the only inbound channel — the content script never initiates
// calls to other modules itself.

console.info("[Cosmos] content script loaded on", window.location.href);

interface ContentRequest {
  kind: "DOM_READ" | "EXECUTE_ACTION";
  action?: BrowserAction;
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

  if (message.kind === "EXECUTE_ACTION" && message.action) {
    executeContentAction(message.action)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error: unknown) =>
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      );
    return true; // async response
  }

  return false;
});

export {};
