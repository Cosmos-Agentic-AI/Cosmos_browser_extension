import { CosmosMessage } from "@shared/types/messages";
import { routeMessage } from "./router";
import { handleChatPort } from "./chatPort";

chrome.runtime.onInstalled.addListener((details) => {
  // Open side panel on toolbar click instead of a fixed-size popup.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

  // Right-click context menu: run selected text as a goal.
  chrome.contextMenus.create({
    id: "cosmos-run-selection",
    title: 'Run with Cosmos: "%s"',
    contexts: ["selection"],
  });

  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "cosmos-run-selection" && info.selectionText) {
    chrome.storage.local.set({ cosmos_pending_goal: info.selectionText }).catch(console.error);
    if (tab?.id) chrome.sidePanel.open({ tabId: tab.id }).catch(console.error);
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "cosmos-chat") {
    handleChatPort(port);
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
