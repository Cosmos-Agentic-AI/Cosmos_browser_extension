import { useState } from "react";
import { IconBrain, IconVariable, IconChevronDown } from "./Icons";

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
    <div className="mb-3 space-y-1.5 animate-slide-down">
      {notes.map((note, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 rounded-xl border border-cosmos-accentDim bg-cosmos-accentDim px-3 py-2 animate-fade-in"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <IconBrain size={12} className="mt-0.5 shrink-0 text-cosmos-accent" />
          <p className="text-xs text-cosmos-textMuted leading-relaxed">{note}</p>
        </div>
      ))}

      {hasVars && (
        <div className="rounded-xl border border-cosmos-border bg-cosmos-surface overflow-hidden">
          <button
            onClick={() => setShowVars((v) => !v)}
            className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-cosmos-surface2 transition-colors"
          >
            <IconVariable size={12} className="shrink-0 text-cosmos-accent" />
            <span className="flex-1 text-left text-xs text-cosmos-textMuted">
              Extracted variables
              <span className="ml-1.5 rounded-md bg-cosmos-surface2 px-1.5 py-0.5 text-2xs text-cosmos-textMuted">
                {Object.keys(variables!).length}
              </span>
            </span>
            <IconChevronDown
              size={12}
              className={`text-cosmos-textSubtle transition-transform duration-200 ${showVars ? "rotate-180" : ""}`}
            />
          </button>
          {showVars && (
            <div className="border-t border-cosmos-border px-3 py-2.5 space-y-1.5 animate-slide-down">
              {Object.entries(variables!).map(([k, v]) => (
                <div key={k} className="flex items-start gap-2 text-xs">
                  <code className="shrink-0 rounded bg-cosmos-surface2 px-1.5 py-0.5 text-2xs font-mono text-cosmos-accent">
                    {`{{${k}}}`}
                  </code>
                  <span className="text-cosmos-textMuted truncate-2 leading-relaxed">
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
