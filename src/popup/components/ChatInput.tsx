import { useState } from "react";
import { ExecutionStatus } from "@shared/types/chat";
import { QuickActions } from "./QuickActions";

const BUSY_STATUSES: ExecutionStatus[] = ["planning", "executing", "recovering", "awaiting_confirmation"];

export function ChatInput({
  status,
  onSend,
  onCancel,
  onRetry,
  onClear,
  onShowShortcuts,
  canRetry,
  recentGoals = [],
}: {
  status: ExecutionStatus;
  onSend: (goal: string) => void;
  onCancel: () => void;
  onRetry: () => void;
  onClear: () => void;
  onShowShortcuts: () => void;
  canRetry: boolean;
  recentGoals?: string[];
}) {
  const [value, setValue] = useState("");
  const [showRecent, setShowRecent] = useState(false);
  const busy = BUSY_STATUSES.includes(status);

  const submit = (goal = value) => {
    const trimmed = goal.trim();
    if (!trimmed || busy) return;
    onSend(trimmed);
    setValue("");
    setShowRecent(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { submit(); return; }
    if (e.key === "?" && !value) { e.preventDefault(); onShowShortcuts(); }
    if (e.key === "Escape") setShowRecent(false);
  };

  const visibleRecent = recentGoals.filter((g) => !value || g.toLowerCase().includes(value.toLowerCase()));

  return (
    <div className="border-t border-cosmos-border pt-3">
      {status === "error" && canRetry && (
        <button
          onClick={onRetry}
          className="mb-2 w-full rounded-lg border border-cosmos-border py-1.5 text-xs text-cosmos-textMuted hover:text-cosmos-text"
        >
          Retry last task
        </button>
      )}

      {!busy && <QuickActions onSelect={submit} disabled={busy} />}

      {showRecent && !busy && visibleRecent.length > 0 && (
        <div className="mb-2 flex flex-col gap-1">
          {visibleRecent.map((goal) => (
            <button
              key={goal}
              onMouseDown={(e) => { e.preventDefault(); submit(goal); }}
              className="truncate rounded-md border border-cosmos-border bg-cosmos-surface px-3 py-1.5 text-left text-xs text-cosmos-textMuted hover:border-cosmos-accent hover:text-cosmos-text"
            >
              {goal}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowRecent(true)}
          onBlur={() => setTimeout(() => setShowRecent(false), 150)}
          disabled={busy}
          placeholder={busy ? statusLabel(status) : "What should Cosmos do? (? for shortcuts)"}
          className="flex-1 rounded-lg border border-cosmos-border bg-cosmos-surface px-3 py-2 text-sm outline-none focus:border-cosmos-accent disabled:opacity-60"
        />
        {busy ? (
          <button
            onClick={onCancel}
            className="rounded-lg border border-cosmos-danger px-3 py-2 text-xs font-medium text-cosmos-danger"
          >
            Stop
          </button>
        ) : (
          <>
            {(status === "done" || status === "error") && (
              <button
                onClick={onClear}
                className="rounded-lg border border-cosmos-border px-3 py-2 text-xs text-cosmos-textMuted hover:text-cosmos-text"
                title="Clear chat"
              >
                ✕
              </button>
            )}
            <button
              onClick={() => submit()}
              className="rounded-lg bg-cosmos-accent px-3 py-2 text-xs font-medium text-white hover:bg-cosmos-accentMuted"
            >
              Send
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function statusLabel(status: ExecutionStatus): string {
  switch (status) {
    case "planning":
      return "Planning…";
    case "executing":
      return "Executing…";
    case "recovering":
      return "Recovering from a failed step…";
    case "awaiting_confirmation":
      return "Waiting for your confirmation above…";
    default:
      return "Working…";
  }
}
