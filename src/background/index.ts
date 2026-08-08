import { CosmosMessage } from "@shared/types/messages";
import { routeMessage } from "./router";
import { handleChatPort } from "./chatPort";

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "cosmos-chat") {
    handleChatPort(port);
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((message: CosmosMessage, sender, sendResponse) => {
  routeMessage(message, sender)
    .then((result) => sendResponse({ ok: true, data: result }))
    .catch((error: unknown) => {
      console.error("[Cosmos Router] error handling message", message.type, error);
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });

  // Keep the message channel open for the async response above.
  return true;
});
