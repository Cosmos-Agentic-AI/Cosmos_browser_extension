import { TimelineStep } from "@shared/types/chat";
import { IconCheck, IconX, IconSpinner, IconChevronRight } from "./Icons";

function StatusDot({ status }: { status: TimelineStep["status"] }) {
  if (status === "running") {
    return (
      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <div className="absolute h-5 w-5 rounded-full bg-cosmos-accent opacity-20 animate-pulse-dot" />
        <div className="h-2.5 w-2.5 rounded-full bg-cosmos-accent" />
      </div>
    );
  }
  if (status === "done") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cosmos-successDim">
        <IconCheck size={11} className="text-cosmos-success" />
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cosmos-dangerDim">
        <IconX size={11} className="text-cosmos-danger" />
      </div>
    );
  }
  if (status === "skipped") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cosmos-border">
        <div className="h-1 w-3 rounded-full bg-cosmos-textSubtle" />
      </div>
    );
  }
  // pending
  return (
    <div className="h-5 w-5 shrink-0 rounded-full border border-cosmos-border bg-cosmos-surface2" />
  );
}

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

  const doneCount = timeline.filter(
    (t) => t.status === "done" || t.status === "skipped" || t.status === "failed",
  ).length;
  const pct = timeline.length > 0 ? (doneCount / timeline.length) * 100 : 0;
  const hasRunning = timeline.some((t) => t.status === "running");

  return (
    <div className="mb-3 animate-slide-up rounded-2xl border border-cosmos-border bg-cosmos-surface shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-cosmos-border">
        <div className="flex items-center gap-2">
          {hasRunning && <IconSpinner size={12} className="text-cosmos-accent" />}
          <span className="text-xs font-medium text-cosmos-textMuted uppercase tracking-wider">
            Execution
          </span>
        </div>
        <span className="text-xs text-cosmos-textMuted tabular-nums">
          {doneCount}/{timeline.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] w-full bg-cosmos-border">
        <div
          className={`h-full gradient-bg transition-all duration-500 ease-smooth ${hasRunning ? "animate-progress-pulse" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <ol className="p-2 space-y-0.5">
        {timeline.map((t) => (
          <li
            key={t.step.id}
            className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 ${
              t.status === "running" ? "bg-cosmos-accentDim" :
              t.status === "failed"  ? "bg-cosmos-dangerDim" :
              t.status === "done"    ? "" : ""
            }`}
          >
            <div className="mt-0.5">
              <StatusDot status={t.status} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm leading-snug ${
                    t.status === "skipped" ? "text-cosmos-textMuted line-through" :
                    t.status === "running" ? "text-cosmos-text font-medium" :
                    t.status === "done"    ? "text-cosmos-textMuted" :
                    t.status === "failed"  ? "text-cosmos-danger" :
                    "text-cosmos-textMuted"
                  }`}
                >
                  {t.step.description}
                </span>
                {t.status === "done" && t.result?.durationMs != null && (
                  <span className="shrink-0 text-2xs text-cosmos-textSubtle tabular-nums">
                    {fmtDuration(t.result.durationMs)}
                  </span>
                )}
              </div>

              {t.status === "failed" && t.result?.error && (
                <p className="mt-1 text-xs text-cosmos-danger/80 leading-snug">
                  {t.result.error}
                </p>
              )}

              {t.status === "failed" && onRetryStep && (
                <button
                  onClick={() => onRetryStep(t.step.description)}
                  className="mt-1.5 flex items-center gap-1 text-2xs text-cosmos-accent hover:text-cosmos-accentMuted transition-colors"
                >
                  <IconChevronRight size={10} />
                  Retry this step
                </button>
              )}

              {t.status === "failed" && stepScreenshots[t.step.id] && (
                <img
                  src={stepScreenshots[t.step.id]}
                  alt="Failure screenshot"
                  className="mt-2 w-full max-h-32 rounded-lg border border-cosmos-danger/20 object-cover object-top"
                />
              )}

              {pendingConfirmationStepId === t.step.id && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => onConfirm(t.step.id, true)}
                    className="flex items-center gap-1.5 rounded-lg gradient-bg px-3 py-1.5 text-xs font-medium text-white shadow-sm"
                  >
                    <IconCheck size={11} />
                    Approve
                  </button>
                  <button
                    onClick={() => onConfirm(t.step.id, false)}
                    className="flex items-center gap-1.5 rounded-lg border border-cosmos-border px-3 py-1.5 text-xs text-cosmos-textMuted hover:text-cosmos-text transition-colors"
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
