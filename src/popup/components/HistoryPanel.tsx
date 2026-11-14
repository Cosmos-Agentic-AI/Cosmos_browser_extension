import { useEffect, useState } from "react";
import { TaskRun } from "@shared/types/memory";
import { sendToRouter } from "@shared/utils/sendToRouter";

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
  if (!end) return "—";
  const s = Math.round((end - start) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function HistoryPanel({ onClose }: { onClose: () => void }) {
  const [runs, setRuns] = useState<TaskRun[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    sendToRouter<{ limit?: number }, TaskRun[]>("HISTORY_LIST", { limit: 50 }, "popup").then(setRuns);

  useEffect(() => { void load(); }, []);

  const clearHistory = async () => {
    if (!confirm("Clear all task history? This cannot be undone.")) return;
    setBusy(true);
    try {
      await sendToRouter("HISTORY_CLEAR", undefined, "popup");
      setRuns([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-4 text-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">History</h2>
        <div className="flex gap-3">
          <button
            onClick={clearHistory}
            disabled={busy || !runs?.length}
            className="text-xs text-cosmos-danger hover:underline disabled:opacity-40"
          >
            Clear
          </button>
          <button onClick={onClose} className="text-xs text-cosmos-textMuted hover:text-cosmos-text">
            Close
          </button>
        </div>
      </div>

      {runs === null ? (
        <div className="text-xs text-cosmos-textMuted">Loading…</div>
      ) : runs.length === 0 ? (
        <div className="mt-8 text-center text-xs text-cosmos-textMuted">No task runs yet.</div>
      ) : (
        <ol className="flex-1 overflow-y-auto space-y-2">
          {runs.map((run) => (
            <li
              key={run.id}
              className="rounded-lg border border-cosmos-border bg-cosmos-surface p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`mt-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    run.success === true
                      ? "text-cosmos-success"
                      : run.success === false
                        ? "text-cosmos-danger"
                        : "text-cosmos-textMuted"
                  }`}
                >
                  {run.success === true ? "✓ done" : run.success === false ? "✕ failed" : "…"}
                </span>
                <span className="text-[11px] text-cosmos-textMuted whitespace-nowrap">
                  {formatRelative(run.startedAt)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-snug line-clamp-2">{run.goal}</p>
              <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-cosmos-textMuted">
                {run.domain && <span>{run.domain}</span>}
                <span>{run.stepCount} step{run.stepCount !== 1 ? "s" : ""}</span>
                <span>{formatDuration(run.startedAt, run.finishedAt)}</span>
              </div>
              {run.verdict && (
                <p className="mt-1.5 text-[11px] text-cosmos-textMuted italic leading-snug line-clamp-2">
                  {run.verdict}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
