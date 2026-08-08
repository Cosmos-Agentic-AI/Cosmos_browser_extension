import { BrowserAction } from "@shared/types/actions";

export async function switchTab(tabId: number): Promise<void> {
  await chrome.tabs.update(tabId, { active: true });
}

export async function openTab(url: string): Promise<number> {
  const tab = await chrome.tabs.create({ url, active: true });
  if (tab.id === undefined) throw new Error("chrome.tabs.create did not return a tab id.");
  return tab.id;
}

export async function closeTab(tabId: number): Promise<void> {
  await chrome.tabs.remove(tabId);
}

export async function navigate(tabId: number, url: string): Promise<void> {
  await chrome.tabs.update(tabId, { url });
  await waitForTabLoad(tabId);
}

function waitForTabLoad(tabId: number, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeoutMs);

    function listener(updatedTabId: number, info: chrome.tabs.TabChangeInfo) {
      if (updatedTabId === tabId && info.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

export async function listTabs(): Promise<chrome.tabs.Tab[]> {
  return chrome.tabs.query({});
}

/** Resolves once a download starts, or times out. Used after a click that's expected to trigger one. */
export function waitForDownload(timeoutMs = 20000): Promise<chrome.downloads.DownloadItem | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.downloads.onCreated.removeListener(listener);
      resolve(null);
    }, timeoutMs);

    function listener(item: chrome.downloads.DownloadItem) {
      clearTimeout(timeout);
      chrome.downloads.onCreated.removeListener(listener);
      resolve(item);
    }
    chrome.downloads.onCreated.addListener(listener);
  });
}

/** Actions the background script handles directly, versus forwarding to the content script. */
export const TAB_SCOPED_ACTION_TYPES = new Set<BrowserAction["type"]>([
  "switch_tab",
  "open_tab",
  "close_tab",
  "navigate",
  "wait_for_download",
]);

export async function executeTabAction(action: BrowserAction, currentTabId: number): Promise<unknown> {
  switch (action.type) {
    case "switch_tab": {
      if (action.tabId === undefined) throw new Error("switch_tab requires tabId.");
      await switchTab(action.tabId);
      return { switchedTo: action.tabId };
    }
    case "open_tab": {
      if (!action.value) throw new Error("open_tab requires a url in value.");
      const id = await openTab(action.value);
      return { openedTabId: id };
    }
    case "close_tab": {
      const id = action.tabId ?? currentTabId;
      await closeTab(id);
      return { closedTabId: id };
    }
    case "navigate": {
      if (!action.value) throw new Error("navigate requires a url in value.");
      await navigate(action.tabId ?? currentTabId, action.value);
      return { navigatedTo: action.value };
    }
    case "wait_for_download": {
      const item = await waitForDownload(action.timeoutMs ?? 20000);
      return { download: item };
    }
    default:
      throw new Error(`executeTabAction: unsupported action type "${action.type}" for tab scope.`);
  }
}
