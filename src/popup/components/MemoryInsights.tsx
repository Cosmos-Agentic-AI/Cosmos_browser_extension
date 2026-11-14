import { useState } from "react";

export function MemoryInsights({
  notes,
  variables,
}: {
  notes: string[];
  variables?: Record<string, unknown>;
}) {
  const [showVars, setShowVars] = useState(false);
  const hasVars = variables && Object.keys(variables).length > 0;

  if (notes.length === 0 && !hasVars) return null;

  return (
    <div className="mb-3 space-y-1">
      {notes.map((note, i) => (
        <div
          key={i}
          className="rounded-md border border-cosmos-accentMuted/40 bg-cosmos-accentMuted/10 px-2.5 py-1.5 text-[11px] text-cosmos-textMuted"
        >
          🧠 {note}
        </div>
      ))}
      {hasVars && (
        <div className="rounded-md border border-cosmos-border bg-cosmos-surface px-2.5 py-1.5 text-[11px]">
          <button
            onClick={() => setShowVars((v) => !v)}
            className="flex w-full items-center justify-between text-cosmos-textMuted hover:text-cosmos-text"
          >
            <span>📦 Extracted variables ({Object.keys(variables).length})</span>
            <span>{showVars ? "▲" : "▼"}</span>
          </button>
          {showVars && (
            <div className="mt-1.5 space-y-1">
              {Object.entries(variables).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="font-mono text-cosmos-accent">{`{{${k}}}`}</span>
                  <span className="truncate text-cosmos-textMuted">
                    {typeof v === "string" ? v : JSON.stringify(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
