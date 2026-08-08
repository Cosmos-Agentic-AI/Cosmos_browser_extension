import { ActionResult, PlanStep } from "./actions";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

export type TimelineStepStatus = "pending" | "running" | "done" | "failed" | "skipped";

export interface TimelineStep {
  step: PlanStep;
  status: TimelineStepStatus;
  result?: ActionResult;
}

export type ExecutionStatus =
  | "idle"
  | "planning"
  | "awaiting_confirmation"
  | "executing"
  | "recovering" // specialist agent engaged
  | "done"
  | "error"
  | "cancelled";

/** Streamed over the long-lived "cosmos-chat" port, one event per update. */
export type ChatStreamEvent =
  | { kind: "text_chunk"; delta: string }
  | { kind: "status"; status: ExecutionStatus }
  | { kind: "timeline"; timeline: TimelineStep[] }
  | { kind: "memory_insight"; note: string }
  | { kind: "done" }
  | { kind: "error"; message: string };

export interface ChatRequestPayload {
  goal: string;
  tabId: number;
}
