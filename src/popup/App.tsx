import { useEffect, useState } from "react";
import { CosmosSettings } from "@shared/types/settings";
import { sendToRouter } from "@shared/utils/sendToRouter";
import { useChatStore } from "@modules/chat/chatStore";
import { MessageList } from "./components/MessageList";
import { ExecutionTimeline } from "./components/ExecutionTimeline";
import { ChatInput } from "./components/ChatInput";
import { MemoryInsights } from "./components/MemoryInsights";
import { SettingsPanel } from "./components/SettingsPanel";

export function App() {
  const [settings, setSettings] = useState<CosmosSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);

  useEffect(() => {
    sendToRouter<undefined, CosmosSettings>("SETTINGS_GET_KEYS", undefined, "popup").then(setSettings);
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id !== undefined) setActiveTabId(tab.id);
    });
  }, []);

  if (!settings) {
    return <div className="p-6 text-sm text-cosmos-textMuted">Loading Cosmos…</div>;
  }

  if (!settings.onboardingComplete) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-cosmos-textMuted">Finish setup to start using Cosmos.</p>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="rounded-lg bg-cosmos-accent px-4 py-2 text-sm font-medium text-white hover:bg-cosmos-accentMuted"
        >
          Continue setup
        </button>
      </div>
    );
  }

  if (showSettings) {
    return <SettingsPanel onClose={() => setShowSettings(false)} />;
  }

  return <ChatScreen activeTabId={activeTabId} onOpenSettings={() => setShowSettings(true)} />;
}

function ChatScreen({
  activeTabId,
  onOpenSettings,
}: {
  activeTabId: number | null;
  onOpenSettings: () => void;
}) {
  const {
    messages,
    timeline,
    status,
    memoryInsights,
    pendingConfirmationStepId,
    errorMessage,
    connect,
    sendGoal,
    cancel,
    confirmStep,
    retryLast,
    lastGoal,
  } = useChatStore();

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm uppercase tracking-[0.2em] text-cosmos-accent">Cosmos</div>
        <button onClick={onOpenSettings} className="text-xs text-cosmos-textMuted hover:text-cosmos-text">
          Settings
        </button>
      </div>

      <MemoryInsights notes={memoryInsights} />
      <ExecutionTimeline
        timeline={timeline}
        pendingConfirmationStepId={pendingConfirmationStepId}
        onConfirm={confirmStep}
      />

      {errorMessage && (
        <div className="mb-3 rounded-md border border-cosmos-danger/50 bg-cosmos-danger/10 px-2.5 py-1.5 text-xs text-cosmos-danger">
          {errorMessage}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
      </div>

      <ChatInput
        status={status}
        onSend={(goal) => activeTabId !== null && sendGoal(goal, activeTabId)}
        onCancel={cancel}
        onRetry={() => activeTabId !== null && retryLast(activeTabId)}
        canRetry={Boolean(lastGoal)}
      />
    </div>
  );
}
