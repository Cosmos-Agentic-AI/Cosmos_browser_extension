import { useEffect, useState } from "react";
import { CosmosSettings } from "@shared/types/settings";
import { sendToRouter } from "@shared/utils/sendToRouter";
import { useChatStore } from "@modules/chat/chatStore";
import { MessageList } from "./components/MessageList";
import { ExecutionTimeline } from "./components/ExecutionTimeline";
import { ChatInput } from "./components/ChatInput";
import { MemoryInsights } from "./components/MemoryInsights";
import { SettingsPanel } from "./components/SettingsPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { WorkflowPanel } from "./components/WorkflowPanel";
import { ShortcutsOverlay } from "./components/ShortcutsOverlay";
import {
  IconChat,
  IconWorkflows,
  IconHistory,
  IconSettings,
  IconSparkle,
} from "./components/Icons";

type AppView = "chat" | "history" | "settings" | "workflows";

function applyTheme(theme: CosmosSettings["theme"]) {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else if (theme === "system") {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
}

export function App() {
  const [settings, setSettings] = useState<CosmosSettings | null>(null);
  const [view, setView] = useState<AppView>("chat");
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [pendingGoal, setPendingGoal] = useState<string | null>(null);

  useEffect(() => {
    sendToRouter<undefined, CosmosSettings>("SETTINGS_GET_KEYS", undefined, "popup").then((s) => {
      setSettings(s);
      applyTheme(s.theme);
    });
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id !== undefined) setActiveTabId(tab.id);
    });
    chrome.storage.local.get("cosmos_pending_goal", (result) => {
      const goal = result["cosmos_pending_goal"] as string | undefined;
      if (goal) {
        setPendingGoal(goal);
        chrome.storage.local.remove("cosmos_pending_goal");
      }
    });
  }, []);

  if (!settings) {
    return (
      <div className="flex h-full items-center justify-center gap-3 flex-col">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-bg shadow-glow">
          <IconSparkle size={18} className="text-white" />
        </div>
        <p className="text-xs text-cosmos-textMuted">Loading Cosmos…</p>
      </div>
    );
  }

  if (!settings.onboardingComplete) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg shadow-glow">
          <IconSparkle size={22} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-cosmos-text">Set up Cosmos</p>
          <p className="mt-1 text-xs text-cosmos-textMuted">Add an API key to get started.</p>
        </div>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="rounded-xl gradient-bg px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity shadow-sm"
        >
          Continue setup →
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page content */}
      <div className="flex-1 overflow-hidden">
        {view === "chat" && (
          <ChatScreen
            activeTabId={activeTabId}
            pendingGoal={pendingGoal}
            onPendingGoalConsumed={() => setPendingGoal(null)}
          />
        )}
        {view === "workflows" && (
          <WorkflowPanel
            onClose={() => setView("chat")}
            onRunWorkflow={(goal) => { setPendingGoal(goal); setView("chat"); }}
          />
        )}
        {view === "history" && <HistoryPanel onClose={() => setView("chat")} />}
        {view === "settings" && <SettingsPanel onClose={() => setView("chat")} />}
      </div>

      {/* Bottom tab bar */}
      <BottomNav view={view} onNavigate={setView} />
    </div>
  );
}

function BottomNav({ view, onNavigate }: { view: AppView; onNavigate: (v: AppView) => void }) {
  const { status } = useChatStore();
  const isBusy = ["planning", "executing", "recovering", "awaiting_confirmation"].includes(status);

  const tabs: { id: AppView; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
    {
      id: "chat",
      label: "Chat",
      icon: <IconChat size={16} />,
      badge: isBusy ? (
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-cosmos-accent animate-pulse-dot ring-1 ring-cosmos-bg" />
      ) : undefined,
    },
    { id: "workflows", label: "Flows", icon: <IconWorkflows size={16} /> },
    { id: "history", label: "History", icon: <IconHistory size={16} /> },
    { id: "settings", label: "Settings", icon: <IconSettings size={16} /> },
  ];

  return (
    <div className="border-t border-cosmos-border bg-cosmos-bg/95 backdrop-blur-sm px-1 pb-1 pt-1">
      <div className="flex items-stretch">
        {tabs.map(({ id, label, icon, badge }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-all duration-150 ${
                active
                  ? "text-cosmos-accent"
                  : "text-cosmos-textMuted hover:text-cosmos-text hover:bg-cosmos-surface"
              }`}
            >
              {/* Active indicator */}
              {active && (
                <span className="absolute top-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full gradient-bg" />
              )}
              <span className="relative">
                {icon}
                {badge}
              </span>
              <span className={`text-2xs font-medium transition-colors ${active ? "text-cosmos-accent" : ""}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChatScreen({
  activeTabId,
  pendingGoal,
  onPendingGoalConsumed,
}: {
  activeTabId: number | null;
  pendingGoal: string | null;
  onPendingGoalConsumed: () => void;
}) {
  const {
    messages,
    timeline,
    status,
    memoryInsights,
    stepScreenshots,
    extractedVariables,
    estimatedTokens,
    pendingConfirmationStepId,
    errorMessage,
    connect,
    sendGoal,
    cancel,
    confirmStep,
    retryLast,
    clearRun,
    lastGoal,
    recentGoals,
  } = useChatStore();

  const [showShortcuts, setShowShortcuts] = useState(false);
  const isBusy = ["planning", "executing", "recovering", "awaiting_confirmation"].includes(status);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (pendingGoal && activeTabId !== null && status === "idle") {
      sendGoal(pendingGoal, activeTabId);
      onPendingGoalConsumed();
    }
  }, [pendingGoal, activeTabId, status, sendGoal, onPendingGoalConsumed]);

  const handleRetryStep = (description: string) => {
    if (activeTabId !== null)
      sendGoal(`Retry this step on the current page: ${description}`, activeTabId);
  };

  return (
    <div className="flex h-full flex-col px-4 pb-3 pt-4 animate-fade-in">
      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}

      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Logo with optional status ring */}
          <div className="relative">
            <div className={`flex h-7 w-7 items-center justify-center rounded-xl gradient-bg transition-shadow duration-300 ${
              isBusy ? "shadow-glow" : ""
            }`}>
              <IconSparkle size={13} className="text-white" />
            </div>
            {isBusy && (
              <span className="absolute inset-0 rounded-xl ring-1 ring-cosmos-accent/40 animate-[cosmos-pulse-ring_2s_ease-in-out_infinite]" />
            )}
          </div>
          <span className="text-sm font-semibold tracking-tight text-cosmos-text">
            Cosmos
          </span>
        </div>

        {/* Token badge */}
        {estimatedTokens > 0 && (
          <span className="rounded-lg border border-cosmos-border bg-cosmos-surface px-2 py-0.5 text-2xs text-cosmos-textMuted tabular-nums">
            ~{(estimatedTokens / 1000).toFixed(1)}k tokens
          </span>
        )}
      </div>

      {/* Memory + Timeline */}
      <MemoryInsights notes={memoryInsights} variables={extractedVariables} />
      <ExecutionTimeline
        timeline={timeline}
        pendingConfirmationStepId={pendingConfirmationStepId}
        stepScreenshots={stepScreenshots}
        onConfirm={confirmStep}
        onRetryStep={handleRetryStep}
      />

      {/* Error banner */}
      {errorMessage && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-cosmos-danger/40 bg-cosmos-dangerDim px-3 py-2.5 text-xs text-cosmos-danger animate-slide-up">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-px shrink-0">
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1" />
            <path d="M6 4v2.5M6 8h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
      </div>

      {/* Input */}
      <ChatInput
        status={status}
        onSend={(goal) => activeTabId !== null && sendGoal(goal, activeTabId)}
        onCancel={cancel}
        onRetry={() => activeTabId !== null && retryLast(activeTabId)}
        onClear={clearRun}
        onShowShortcuts={() => setShowShortcuts(true)}
        canRetry={Boolean(lastGoal)}
        recentGoals={recentGoals}
      />
    </div>
  );
}
