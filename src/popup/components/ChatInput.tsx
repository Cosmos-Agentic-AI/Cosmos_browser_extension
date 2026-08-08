import { useState } from "react";
import { ExecutionStatus } from "@shared/types/chat";

const BUSY_STATUSES: ExecutionStatus[] = ["planning", "executing", "recovering", "awaiting_confirmation"];

export function ChatInput({
  status,
  onSend,
  onCancel,
  onRetry,
  canRetry,
}: {
  status: ExecutionStatus;
  onSend: (goal: string) => void;
  onCancel: () => void;
  onRetry: () => void;
  canRetry: boolean;
}) {
  const [value, setValue] = useState("");
  const busy = BUSY_STATUSES.includes(status);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    onSend(trimmed);
    setValue("");
  };

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
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={busy}
          placeholder={busy ? statusLabel(status) : "What should Cosmos do?"}
          className="flex-1 rounded-lg border border-cosmos-border bg-cosmos-surface px-3 py-2 text-sm outline-none focus:border-cosmos-accent disabled:opacity-60"
        />
        {busy ? (
          <button
            onClick={onCancel}
            className="rounded-lg border border-cosmos-danger px-3 py-2 text-xs font-medium text-cosmos-danger"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={submit}
            className="rounded-lg bg-cosmos-accent px-3 py-2 text-xs font-medium text-white hover:bg-cosmos-accentMuted"
          >
            Send
          </button>
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
