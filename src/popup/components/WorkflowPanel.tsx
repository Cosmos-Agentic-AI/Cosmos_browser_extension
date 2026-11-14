import { useEffect, useState } from "react";
import { WorkflowMemory } from "@shared/types/memory";
import { sendToRouter } from "@shared/utils/sendToRouter";

export function WorkflowPanel({
  onClose,
  onRunWorkflow,
}: {
  onClose: () => void;
  onRunWorkflow: (goal: string) => void;
}) {
  const [workflows, setWorkflows] = useState<WorkflowMemory[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    sendToRouter<undefined, WorkflowMemory[]>("MEMORY_LIST_WORKFLOWS", undefined, "popup").then(setWorkflows);

  useEffect(() => { void load(); }, []);

  const deleteWorkflow = async (id: string) => {
    setBusy(true);
    try {
      await sendToRouter<{ id: string }, { deleted: boolean }>("MEMORY_DELETE_WORKFLOW", { id }, "popup");
      setWorkflows((ws) => ws?.filter((w) => w.id !== id) ?? []);
    } finally {
      setBusy(false);
    }
  };

  const exportWorkflows = async () => {
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
    <div className="flex h-full flex-col p-4 text-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Saved Workflows</h2>
        <div className="flex gap-3">
          {workflows && workflows.length > 0 && (
            <button onClick={exportWorkflows} className="text-xs text-cosmos-textMuted hover:text-cosmos-text">
              Export
            </button>
          )}
          <button onClick={onClose} className="text-xs text-cosmos-textMuted hover:text-cosmos-text">
            Close
          </button>
        </div>
      </div>

      {workflows === null ? (
        <div className="text-xs text-cosmos-textMuted">Loading…</div>
      ) : workflows.length === 0 ? (
        <div className="mt-8 text-center text-xs text-cosmos-textMuted">
          No saved workflows yet. Complete tasks successfully to build a library.
        </div>
      ) : (
        <ol className="flex-1 overflow-y-auto space-y-2">
          {workflows.map((wf) => (
            <li key={wf.id} className="rounded-lg border border-cosmos-border bg-cosmos-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium leading-snug">{wf.name}</p>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => { onRunWorkflow(wf.name); onClose(); }}
                    className="text-[11px] text-cosmos-accent hover:underline"
                  >
                    Run
                  </button>
                  <button
                    onClick={() => deleteWorkflow(wf.id)}
                    disabled={busy}
                    className="text-[11px] text-cosmos-danger hover:underline disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-cosmos-textMuted">
                {wf.domain && <span>{wf.domain}</span>}
                <span>{wf.steps.length} steps</span>
                <span>{wf.successCount}/{wf.timesUsed} success</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
