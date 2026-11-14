import { ActionResult, BrowserAction, PlanStep } from "@shared/types/actions";
import { PageSnapshot } from "@shared/types/dom";
import { executeTabAction, TAB_SCOPED_ACTION_TYPES } from "@modules/browser-controller/tabController";
import { CosmosSettings } from "@shared/types/settings";
import { chatComplete } from "@modules/api-manager/llmClient";

interface ContentResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function sendToContentScript<T>(
  tabId: number,
  message: { kind: "DOM_READ" | "EXECUTE_ACTION" | "WAIT_FOR_SETTLE" | "DOM_FINGERPRINT"; action?: BrowserAction; timeoutMs?: number },
): Promise<T> {
  const send = async () => {
    const response = (await chrome.tabs.sendMessage(tabId, message)) as ContentResponse<T> | undefined;
    if (!response?.ok) {
      throw new Error(
        response?.error ??
          "No response from content script — the page may not have loaded, or is a restricted chrome:// page.",
      );
    }
    return response.data as T;
  };

  try {
    return await send();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Content script not present (tab was open before extension install/reload).
    // Inject it dynamically and retry once.
    if (msg.includes("Could not establish connection") || msg.includes("Receiving end does not exist")) {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content/index.js"] });
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
      return send();
    }
    throw err;
  }
}

/** Returns the page's current state fingerprint (url + visible text + input values). */
async function getFingerprint(tabId: number): Promise<string> {
  try {
    const r = await sendToContentScript<{ fingerprint: string }>(tabId, { kind: "DOM_FINGERPRINT" });
    return r.fingerprint;
  } catch {
    return "";
  }
}

/**
 * Actions that are expected to change visible page state.
 * DOM-diff verification runs after these.
 */
const MUTATING_ACTIONS = new Set(["click", "type", "select_option", "press_key", "execute_js"]);

/**
 * Actions after which the DOM should be allowed to settle before the next read.
 */
const SETTLE_AFTER = new Set(["click", "type", "navigate", "press_key", "execute_js", "open_tab"]);

export async function readPageSnapshot(tabId: number, waitForSettle = true): Promise<PageSnapshot> {
  if (waitForSettle) {
    // Allow any pending SPA re-renders to finish before snapshotting.
    await sendToContentScript(tabId, { kind: "WAIT_FOR_SETTLE", timeoutMs: 2000 }).catch(() => {});
  }
  return sendToContentScript<PageSnapshot>(tabId, { kind: "DOM_READ" });
}

/**
 * Action Executor
 * ----------------
 * Given one PlanStep, executes its action against the right surface
 * (background tab APIs vs. the content script) and returns a normalized
 * ActionResult. Never called directly by the UI — only the orchestrator
 * (which the Router owns) invokes this.
 */
export async function executeStep(
  step: PlanStep,
  tabId: number,
  settings?: CosmosSettings,
): Promise<ActionResult> {
  const start = Date.now();
  try {
    let output: unknown;

    if (step.action.type === "read_dom") {
      output = await readPageSnapshot(tabId);
    } else if (step.action.type === "ask_user_confirmation") {
      // Handled upstream by the orchestrator before execution reaches here;
      // if it lands here it means confirmation already happened.
      output = { confirmed: true };
    } else if (step.action.type === "extract") {
      output = await executeExtract(step, tabId, settings);
    } else if (step.action.type === "assert") {
      output = await executeAssert(step, tabId, settings);
    } else if (TAB_SCOPED_ACTION_TYPES.has(step.action.type)) {
      output = await executeTabAction(step.action, tabId);
    } else {
      // For mutating actions capture a before-fingerprint to detect no-op actions.
      const shouldVerify = MUTATING_ACTIONS.has(step.action.type);
      const before = shouldVerify ? await getFingerprint(tabId) : "";

      output = await sendToContentScript(tabId, { kind: "EXECUTE_ACTION", action: step.action });

      // Wait for SPA re-render after actions that trigger DOM mutations.
      if (SETTLE_AFTER.has(step.action.type)) {
        await sendToContentScript(tabId, { kind: "WAIT_FOR_SETTLE" }).catch(() => {});
      }

      // Verify the page actually changed (catches clicks on disabled/no-op elements).
      if (shouldVerify) {
        const after = await getFingerprint(tabId);
        if (after !== "" && before !== "" && after === before) {
          return {
            stepId: step.id,
            ok: false,
            error: "Page state unchanged after action — element may be disabled or the action did not register.",
            durationMs: Date.now() - start,
          };
        }
      }
    }

    return { stepId: step.id, ok: true, output, durationMs: Date.now() - start };
  } catch (error) {
    return {
      stepId: step.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - start,
    };
  }
}

async function executeExtract(
  step: PlanStep,
  tabId: number,
  settings?: CosmosSettings,
): Promise<unknown> {
  const snapshot = await readPageSnapshot(tabId);
  if (!settings) return { error: "Settings required for extract action." };

  const providerId = settings.providers.omniroute.apiKey
    ? "omniroute"
    : settings.providers.openrouter.apiKey
      ? "openrouter"
      : "groq";

  const pageText = [
    snapshot.title,
    snapshot.mainText.slice(0, 3000),
    ...snapshot.interactiveElements.slice(0, 40).map((e) => `${e.role}: ${e.text}`),
  ].join("\n");

  const raw = await chatComplete(settings, {
    providerId,
    model: settings.defaultModel ?? "auto",
    jsonMode: true,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You are a data extraction assistant. Given page content, extract the requested information as JSON. " +
          "Return ONLY valid JSON — no markdown, no commentary.",
      },
      {
        role: "user",
        content: `Extract: ${step.action.value ?? "all relevant data"}\n\nPage content:\n${pageText}`,
      },
    ],
  });

  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

async function executeAssert(
  step: PlanStep,
  tabId: number,
  settings?: CosmosSettings,
): Promise<{ ok: boolean; reason: string }> {
  const snapshot = await readPageSnapshot(tabId);
  if (!settings) throw new Error("Settings required for assert action.");

  const providerId = settings.providers.omniroute.apiKey
    ? "omniroute"
    : settings.providers.openrouter.apiKey
      ? "openrouter"
      : "groq";

  const pageText = [snapshot.title, snapshot.mainText.slice(0, 2000)].join("\n");

  const raw = await chatComplete(settings, {
    providerId,
    model: settings.defaultModel ?? "auto",
    jsonMode: true,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          'Verify whether the given condition is true based on the page content. ' +
          'Respond ONLY as JSON: {"ok": boolean, "reason": string}.',
      },
      {
        role: "user",
        content: `Condition: ${step.action.value ?? "page loaded successfully"}\n\nPage content:\n${pageText}`,
      },
    ],
  });

  let result: { ok: boolean; reason: string };
  try {
    result = JSON.parse(raw) as { ok: boolean; reason: string };
  } catch {
    result = { ok: false, reason: "Could not parse assertion result." };
  }

  if (!result.ok) {
    throw new Error(`Assertion failed: ${result.reason}`);
  }
  return result;
}
