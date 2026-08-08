import { runTask } from "./orchestrator";
import { ChatStreamEvent } from "@shared/types/chat";

type InboundPortMessage =
  | { type: "user_message"; goal: string; tabId: number }
  | { type: "cancel" }
  | { type: "confirm_step"; stepId: string; approved: boolean };

/**
 * Each popup connection gets its own cancellation flag and confirmation
 * resolvers — a task started from one popup session doesn't leak state
 * into another.
 */
export function handleChatPort(port: chrome.runtime.Port): void {
  let cancelled = false;
  const pendingConfirmations = new Map<string, (approved: boolean) => void>();

  const emit = (event: ChatStreamEvent) => {
    try {
      port.postMessage(event);
    } catch {
      // Port closed (popup dismissed mid-task) — nothing more to do.
    }
  };

  port.onMessage.addListener((message: InboundPortMessage) => {
    if (message.type === "user_message") {
      cancelled = false;
      runTask(message.goal, message.tabId, {
        isCancelled: () => cancelled,
        waitForConfirmation: (stepId) =>
          new Promise<boolean>((resolve) => {
            pendingConfirmations.set(stepId, resolve);
          }),
        emit,
      }).catch((error: unknown) => {
        emit({ kind: "error", message: error instanceof Error ? error.message : String(error) });
      });
      return;
    }

    if (message.type === "cancel") {
      cancelled = true;
      return;
    }

    if (message.type === "confirm_step") {
      const resolver = pendingConfirmations.get(message.stepId);
      resolver?.(message.approved);
      pendingConfirmations.delete(message.stepId);
      return;
    }
  });

  port.onDisconnect.addListener(() => {
    cancelled = true;
    pendingConfirmations.clear();
  });
}
