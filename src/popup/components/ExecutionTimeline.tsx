import { TimelineStep } from "@shared/types/chat";

const STATUS_STYLES: Record<TimelineStep["status"], string> = {
  pending: "border-cosmos-border text-cosmos-textMuted",
  running: "border-cosmos-accent text-cosmos-accent",
  done: "border-cosmos-success text-cosmos-success",
  failed: "border-cosmos-danger text-cosmos-danger",
  skipped: "border-cosmos-border text-cosmos-textMuted line-through",
};

const STATUS_ICON: Record<TimelineStep["status"], string> = {
  pending: "○",
  running: "◐",
  done: "●",
  failed: "✕",
  skipped: "–",
};

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ExecutionTimeline({
  timeline,
  pendingConfirmationStepId,
  stepScreenshots,
  onConfirm,
  onRetryStep,
}: {
  timeline: TimelineStep[];
  pendingConfirmationStepId: string | null;
  stepScreenshots: Record<string, string>;
  onConfirm: (stepId: string, approved: boolean) => void;
  onRetryStep?: (description: string) => void;
}) {
  if (timeline.length === 0) return null;

  const doneCount = timeline.filter((t) => t.status === "done" || t.status === "skipped" || t.status === "failed").length;

  return (
    <div className="mb-3 rounded-lg border border-cosmos-border bg-cosmos-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-cosmos-textMuted">Execution</div>
        <div className="text-[11px] text-cosmos-textMuted">
          {doneCount} / {timeline.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-cosmos-border">
        <div
          className="h-full rounded-full bg-cosmos-accent transition-all duration-300"
          style={{ width: `${timeline.length > 0 ? (doneCount / timeline.length) * 100 : 0}%` }}
        />
      </div>

      <ol className="space-y-1.5">
        {timeline.map((t) => (
          <li key={t.step.id} className={`flex items-start gap-2 rounded border-l-2 pl-2 text-xs ${STATUS_STYLES[t.status]}`}>
            <span className="mt-0.5 shrink-0">{STATUS_ICON[t.status]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate">{t.step.description}</span>
                {t.status === "done" && t.result?.durationMs != null && (
                  <span className="shrink-0 text-[10px] text-cosmos-textMuted opacity-60">
                    {fmtDuration(t.result.durationMs)}
                  </span>
                )}
              </div>
              {t.status === "failed" && t.result?.error && (
                <div className="mt-0.5 text-[11px] text-cosmos-danger/80">{t.result.error}</div>
              )}
              {t.status === "failed" && onRetryStep && (
                <button
                  onClick={() => onRetryStep(t.step.description)}
                  className="mt-1 text-[11px] text-cosmos-accent hover:underline"
                >
                  Retry this step →
                </button>
              )}
              {t.status === "failed" && stepScreenshots[t.step.id] && (
                <img
                  src={stepScreenshots[t.step.id]}
                  alt="Failure screenshot"
                  className="mt-1.5 max-h-28 w-full rounded border border-cosmos-danger/30 object-cover object-top"
                />
              )}
              {pendingConfirmationStepId === t.step.id && (
                <div className="mt-1.5 flex gap-2">
                  <button
                    onClick={() => onConfirm(t.step.id, true)}
                    className="rounded bg-cosmos-accent px-2 py-1 text-[11px] font-medium text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onConfirm(t.step.id, false)}
                    className="rounded border border-cosmos-border px-2 py-1 text-[11px] text-cosmos-textMuted"
                  >
                    Skip
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
