import { useEffect, useState } from "react";
import { WorkflowMemory } from "@shared/types/memory";
import { sendToRouter } from "@shared/utils/sendToRouter";
import { IconWorkflows, IconPlay, IconTrash, IconExport, IconX } from "./Icons";

function WorkflowCard({
  wf,
  onRun,
  onDelete,
  deleting,
}: {
  wf: WorkflowMemory;
  onRun: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const successRate = wf.timesUsed > 0 ? Math.round((wf.successCount / wf.timesUsed) * 100) : 0;

  return (
    <div className="group rounded-2xl border border-cosmos-border bg-cosmos-surface p-4 shadow-sm hover:border-cosmos-border/60 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm font-medium text-cosmos-text leading-snug truncate-2 flex-1">{wf.name}</p>
        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 rounded-xl gradient-bg px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity shadow-sm"
          >
            <IconPlay size={11} />
            Run
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex h-7 w-7 items-center justify-center rounded-xl border border-cosmos-border text-cosmos-textMuted hover:bg-cosmos-dangerDim hover:border-cosmos-danger hover:text-cosmos-danger transition-colors disabled:opacity-40"
          >
            <IconTrash size={12} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-cosmos-textMuted">
        {wf.domain && (
          <span className="flex items-center gap-1">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><circle cx="4.5" cy="4.5" r="4" stroke="currentColor" strokeWidth="1" /></svg>
            {wf.domain}
          </span>
        )}
        <span>{wf.steps.length} steps</span>
        <span>{wf.timesUsed} run{wf.timesUsed !== 1 ? "s" : ""}</span>
        {wf.timesUsed > 0 && (
          <span className={successRate >= 80 ? "text-cosmos-success" : successRate >= 50 ? "text-cosmos-warning" : "text-cosmos-danger"}>
            {successRate}% success
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cosmos-border bg-cosmos-surface2">
        <IconWorkflows size={20} className="text-cosmos-textMuted" />
      </div>
      <div>
        <p className="text-sm font-medium text-cosmos-text">No saved workflows</p>
        <p className="mt-0.5 text-xs text-cosmos-textMuted">Complete tasks to build a reusable library</p>
      </div>
    </div>
  );
}

export function WorkflowPanel({
  onClose,
  onRunWorkflow,
}: {
  onClose: () => void;
  onRunWorkflow: (goal: string) => void;
}) {
  const [workflows, setWorkflows] = useState<WorkflowMemory[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    sendToRouter<undefined, WorkflowMemory[]>("MEMORY_LIST_WORKFLOWS", undefined, "popup").then(setWorkflows);
  }, []);

  const deleteWorkflow = async (id: string) => {
    setDeletingId(id);
    try {
      await sendToRouter<{ id: string }, { deleted: boolean }>("MEMORY_DELETE_WORKFLOW", { id }, "popup");
      setWorkflows((ws) => ws?.filter((w) => w.id !== id) ?? []);
    } finally {
      setDeletingId(null);
    }
  };

  const exportWorkflows = () => {
    if (!workflows) return;
    const blob = new Blob([JSON.stringify(workflows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cosmos-workflows-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-cosmos-border px-5 py-4">
        <div>
          <h2 className="text-md font-semibold text-cosmos-text">Workflows</h2>
          <p className="text-xs text-cosmos-textMuted">Saved reusable task flows</p>
        </div>
        <div className="flex items-center gap-2">
          {workflows && workflows.length > 0 && (
            <button
              onClick={exportWorkflows}
              className="flex items-center gap-1.5 rounded-xl border border-cosmos-border px-3 py-1.5 text-xs text-cosmos-textMuted hover:text-cosmos-text hover:bg-cosmos-surface2 transition-colors"
            >
              <IconExport size={12} />
              Export
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
        {workflows === null ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-shimmer" />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2.5">
            {workflows.map((wf) => (
              <WorkflowCard
                key={wf.id}
                wf={wf}
                onRun={() => { onRunWorkflow(wf.name); onClose(); }}
                onDelete={() => deleteWorkflow(wf.id)}
                deleting={deletingId === wf.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
