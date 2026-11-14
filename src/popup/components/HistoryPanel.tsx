import { useEffect, useState } from "react";
import { TaskRun } from "@shared/types/memory";
import { sendToRouter } from "@shared/utils/sendToRouter";
import { IconClock, IconCheck, IconX, IconTrash } from "./Icons";

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatDuration(start: number, end: number | null): string {
  if (!end) return "";
  const s = Math.round((end - start) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function RunCard({ run }: { run: TaskRun }) {
  const dur = formatDuration(run.startedAt, run.finishedAt);
  return (
    <div className="rounded-2xl border border-cosmos-border bg-cosmos-surface p-4 shadow-sm hover:border-cosmos-border/80 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium ${
          run.success === true  ? "bg-cosmos-successDim text-cosmos-success" :
          run.success === false ? "bg-cosmos-dangerDim text-cosmos-danger" :
          "bg-cosmos-surface2 text-cosmos-textMuted"
        }`}>
          {run.success === true  ? <IconCheck size={9} /> :
           run.success === false ? <IconX size={9} /> :
           <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />}
          {run.success === true ? "Completed" : run.success === false ? "Failed" : "Running"}
        </div>
        <div className="flex items-center gap-1 text-2xs text-cosmos-textMuted">
          <IconClock size={10} />
          {formatRelative(run.startedAt)}
        </div>
      </div>

      <p className="text-sm text-cosmos-text leading-snug truncate-2 mb-2">{run.goal}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-cosmos-textMuted">
        {run.domain && (
          <span className="flex items-center gap-1">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><circle cx="4.5" cy="4.5" r="4" stroke="currentColor" strokeWidth="1" /><path d="M4.5.5v8M.5 4.5h8M2 2a4.8 4.8 0 0 1 2.5 2.5A4.8 4.8 0 0 1 7 2" stroke="currentColor" strokeWidth="0.75" /></svg>
            {run.domain}
          </span>
        )}
        <span>{run.stepCount} step{run.stepCount !== 1 ? "s" : ""}</span>
        {dur && <span>{dur}</span>}
      </div>

      {run.verdict && (
        <p className="mt-2 text-xs text-cosmos-textMuted italic leading-relaxed truncate-2 border-t border-cosmos-border pt-2">
          {run.verdict}
        </p>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cosmos-border bg-cosmos-surface2">
        <IconClock size={20} className="text-cosmos-textMuted" />
      </div>
      <div>
        <p className="text-sm font-medium text-cosmos-text">No task history yet</p>
        <p className="mt-0.5 text-xs text-cosmos-textMuted">Completed tasks will appear here</p>
      </div>
    </div>
  );
}

export function HistoryPanel({ onClose }: { onClose: () => void }) {
  const [runs, setRuns] = useState<TaskRun[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sendToRouter<{ limit?: number }, TaskRun[]>("HISTORY_LIST", { limit: 50 }, "popup").then(setRuns);
  }, []);

  const clearHistory = async () => {
    if (!confirm("Clear all task history?")) return;
    setBusy(true);
    try {
      await sendToRouter("HISTORY_CLEAR", undefined, "popup");
      setRuns([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-cosmos-border px-5 py-4">
        <div>
          <h2 className="text-md font-semibold text-cosmos-text">History</h2>
          <p className="text-xs text-cosmos-textMuted">Recent task runs</p>
        </div>
        <div className="flex items-center gap-2">
          {runs && runs.length > 0 && (
            <button
              onClick={clearHistory}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl border border-cosmos-border px-3 py-1.5 text-xs text-cosmos-danger hover:bg-cosmos-dangerDim transition-colors disabled:opacity-40"
            >
              <IconTrash size={12} />
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-cosmos-textMuted hover:bg-cosmos-surface2 hover:text-cosmos-text transition-colors"
          >
            <IconX size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {runs === null ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-shimmer" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2.5">
            {runs.map((run) => <RunCard key={run.id} run={run} />)}
          </div>
        )}
      </div>
    </div>
  );
}
