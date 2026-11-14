import { create } from "zustand";
import { ChatMessage, ChatStreamEvent, ExecutionStatus, TimelineStep } from "@shared/types/chat";

const RECENT_GOALS_KEY = "cosmos_recent_goals";
const MAX_RECENT_GOALS = 6;

function loadRecentGoals(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_GOALS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecentGoals(goals: string[]): void {
  try {
    localStorage.setItem(RECENT_GOALS_KEY, JSON.stringify(goals));
  } catch {
    // storage quota exceeded — ignore
  }
}

function pushRecentGoal(goals: string[], goal: string): string[] {
  const deduped = goals.filter((g) => g !== goal);
  return [goal, ...deduped].slice(0, MAX_RECENT_GOALS);
}

interface ChatState {
  messages: ChatMessage[];
  timeline: TimelineStep[];
  status: ExecutionStatus;
  memoryInsights: string[];
  pendingConfirmationStepId: string | null;
  lastGoal: string | null;
  recentGoals: string[];
  errorMessage: string | null;

  port: chrome.runtime.Port | null;
  connect: () => void;
  sendGoal: (goal: string, tabId: number) => void;
  cancel: () => void;
  confirmStep: (stepId: string, approved: boolean) => void;
  retryLast: (tabId: number) => void;
}

function appendAssistantDelta(messages: ChatMessage[], delta: string): ChatMessage[] {
  const last = messages[messages.length - 1];
  if (last && last.role === "assistant") {
    return [...messages.slice(0, -1), { ...last, content: last.content + delta }];
  }
  return [...messages, { id: crypto.randomUUID(), role: "assistant", content: delta, createdAt: Date.now() }];
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  timeline: [],
  status: "idle",
  memoryInsights: [],
  pendingConfirmationStepId: null,
  lastGoal: null,
  recentGoals: loadRecentGoals(),
  errorMessage: null,
  port: null,

  connect: () => {
    if (get().port) return;
    const port = chrome.runtime.connect({ name: "cosmos-chat" });

    port.onMessage.addListener((event: ChatStreamEvent) => {
      switch (event.kind) {
        case "text_chunk":
          if (event.delta) set((s) => ({ messages: appendAssistantDelta(s.messages, event.delta) }));
          break;
        case "status":
          set({
            status: event.status,
            pendingConfirmationStepId: event.status === "awaiting_confirmation" ? get().pendingConfirmationStepId : null,
          });
          break;
        case "timeline": {
          const awaiting = event.timeline.find((t) => t.status === "pending") ?? null;
          set({
            timeline: event.timeline,
            pendingConfirmationStepId: get().status === "awaiting_confirmation" ? (awaiting?.step.id ?? null) : null,
          });
          break;
        }
        case "memory_insight":
          set((s) => ({ memoryInsights: [...s.memoryInsights, event.note] }));
          break;
        case "error":
          set({ errorMessage: event.message, status: "error" });
          break;
        case "done":
          break;
      }
    });

    port.onDisconnect.addListener(() => set({ port: null }));
    set({ port });
  },

  sendGoal: (goal, tabId) => {
    const { port, messages, recentGoals } = get();
    if (!port) return;
    const updated = pushRecentGoal(recentGoals, goal);
    saveRecentGoals(updated);
    set({
      messages: [...messages, { id: crypto.randomUUID(), role: "user", content: goal, createdAt: Date.now() }],
      timeline: [],
      memoryInsights: [],
      errorMessage: null,
      lastGoal: goal,
      recentGoals: updated,
      status: "planning",
    });
    port.postMessage({ type: "user_message", goal, tabId });
  },

  cancel: () => {
    get().port?.postMessage({ type: "cancel" });
  },

  confirmStep: (stepId, approved) => {
    get().port?.postMessage({ type: "confirm_step", stepId, approved });
    set({ pendingConfirmationStepId: null });
  },

  retryLast: (tabId) => {
    const { lastGoal, port } = get();
    if (!lastGoal || !port) return;
    set({ timeline: [], memoryInsights: [], errorMessage: null, status: "planning" });
    port.postMessage({ type: "user_message", goal: lastGoal, tabId });
  },
}));
