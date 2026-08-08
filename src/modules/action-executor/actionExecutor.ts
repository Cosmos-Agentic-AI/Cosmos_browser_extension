import { ActionResult, BrowserAction, PlanStep } from "@shared/types/actions";
import { PageSnapshot } from "@shared/types/dom";
import { executeTabAction, TAB_SCOPED_ACTION_TYPES } from "@modules/browser-controller/tabController";

interface ContentResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function sendToContentScript<T>(
  tabId: number,
  message: { kind: "DOM_READ" | "EXECUTE_ACTION"; action?: BrowserAction },
): Promise<T> {
  const response = (await chrome.tabs.sendMessage(tabId, message)) as ContentResponse<T> | undefined;
  if (!response?.ok) {
    throw new Error(
      response?.error ??
        "No response from content script — the page may not have loaded, or is a restricted chrome:// page.",
    );
  }
  return response.data as T;
}

export async function readPageSnapshot(tabId: number): Promise<PageSnapshot> {
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
export async function executeStep(step: PlanStep, tabId: number): Promise<ActionResult> {
  const start = Date.now();
  try {
    let output: unknown;

    if (step.action.type === "read_dom") {
      output = await readPageSnapshot(tabId);
    } else if (step.action.type === "ask_user_confirmation") {
      // Handled upstream by the orchestrator before execution reaches here;
      // if it lands here it means confirmation already happened.
      output = { confirmed: true };
    } else if (TAB_SCOPED_ACTION_TYPES.has(step.action.type)) {
      output = await executeTabAction(step.action, tabId);
    } else {
      output = await sendToContentScript(tabId, { kind: "EXECUTE_ACTION", action: step.action });
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
