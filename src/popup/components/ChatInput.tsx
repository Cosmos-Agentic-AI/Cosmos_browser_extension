import { useRef, useState } from "react";
import { ExecutionStatus } from "@shared/types/chat";
import { IconSend, IconStop, IconX, IconSpinner } from "./Icons";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = BUSY_STATUSES.includes(status);
  const isDone = status === "done" || status === "error";

  const submit = (goal = value) => {
    const trimmed = goal.trim();
    if (!trimmed || busy) return;
    onSend(trimmed);
    setValue("");
    setShowRecent(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); return; }
    if (e.key === "?" && !value) { e.preventDefault(); onShowShortcuts(); }
    if (e.key === "Escape") { setShowRecent(false); inputRef.current?.blur(); }
  };

  const visibleRecent = recentGoals.filter(
    (g) => !value || g.toLowerCase().includes(value.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-2 pt-2 border-t border-cosmos-border">
      {/* Quick actions */}
      {!busy && <QuickActions onSelect={submit} disabled={busy} />}

      {/* Recent goals dropdown */}
      {showRecent && !busy && visibleRecent.length > 0 && (
        <div className="rounded-xl border border-cosmos-border bg-cosmos-surface shadow-md overflow-hidden animate-slide-up">
          {visibleRecent.map((goal) => (
            <button
              key={goal}
              onMouseDown={(e) => { e.preventDefault(); submit(goal); }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-cosmos-textMuted hover:bg-cosmos-surface2 hover:text-cosmos-text transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0 opacity-40">
                <path d="M1 5h8M5 1v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="truncate">{goal}</span>
            </button>
          ))}
        </div>
      )}

      {/* Retry banner */}
      {status === "error" && canRetry && (
        <button
          onClick={onRetry}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-cosmos-border py-2 text-xs text-cosmos-textMuted hover:border-cosmos-accent hover:text-cosmos-text transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 6a5 5 0 1 1 1 3M1 6V3M1 6h3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retry last task
        </button>
      )}

      {/* Main input row */}
      <div className={`flex items-center gap-2 rounded-2xl border bg-cosmos-surface px-1 py-1 transition-all duration-200 ${
        busy ? "border-cosmos-accentDim" : "border-cosmos-border focus-within:border-cosmos-accent focus-within:shadow-glow"
      }`}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowRecent(true)}
          onBlur={() => setTimeout(() => setShowRecent(false), 150)}
          disabled={busy}
          placeholder={busy ? statusLabel(status) : "What should Cosmos do? (? for shortcuts)"}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-cosmos-text placeholder:text-cosmos-textMuted outline-none disabled:opacity-50"
        />

        <div className="flex items-center gap-1 pr-1">
          {busy ? (
            <>
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <IconSpinner size={13} className="text-cosmos-accent" />
                <span className="text-2xs text-cosmos-textMuted hidden sm:block">Working…</span>
              </div>
              <button
                onClick={onCancel}
                title="Stop"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-cosmos-danger/50 text-cosmos-danger hover:bg-cosmos-dangerDim transition-colors"
              >
                <IconStop size={14} />
              </button>
            </>
          ) : (
            <>
              {isDone && (
                <button
                  onClick={onClear}
                  title="Clear"
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-cosmos-textMuted hover:bg-cosmos-surface2 hover:text-cosmos-text transition-colors"
                >
                  <IconX size={13} />
                </button>
              )}
              <button
                onClick={() => submit()}
                disabled={!value.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-xl gradient-bg text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <IconSend size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: ExecutionStatus): string {
  switch (status) {
    case "planning":          return "Planning your task…";
    case "executing":         return "Executing…";
    case "recovering":        return "Recovering from a failed step…";
    case "awaiting_confirmation": return "Waiting for your approval above…";
    default:                  return "Working…";
  }
}
