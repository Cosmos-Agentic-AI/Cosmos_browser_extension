import { useEffect } from "react";
import { IconX } from "./Icons";

const SHORTCUTS = [
  { keys: ["Enter"],              action: "Send goal" },
  { keys: ["Ctrl", "Shift", "Space"], action: "Open Cosmos panel" },
  { keys: ["?"],                  action: "Show this overlay" },
  { keys: ["Esc"],                action: "Close / dismiss" },
];

export function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(9, 9, 15, 0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-80 rounded-2xl border border-cosmos-border bg-cosmos-surface shadow-lg animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-cosmos-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-cosmos-text">Keyboard shortcuts</h3>
            <p className="mt-0.5 text-xs text-cosmos-textMuted">Navigate Cosmos without a mouse</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-cosmos-textMuted hover:bg-cosmos-surface2 hover:text-cosmos-text transition-colors"
          >
            <IconX size={13} />
          </button>
        </div>

        <div className="p-4 space-y-1.5">
          {SHORTCUTS.map(({ keys, action }) => (
            <div key={action} className="flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 hover:bg-cosmos-surface2 transition-colors">
              <div className="flex items-center gap-1">
                {keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <kbd className="rounded-md border border-cosmos-border bg-cosmos-surface3 px-2 py-1 font-mono text-2xs text-cosmos-text shadow-sm">
                      {k}
                    </kbd>
                    {i < keys.length - 1 && (
                      <span className="text-2xs text-cosmos-textSubtle">+</span>
                    )}
                  </span>
                ))}
              </div>
              <span className="text-xs text-cosmos-textMuted">{action}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-cosmos-border px-5 py-3">
          <p className="text-2xs text-cosmos-textMuted text-center">
            Press <kbd className="rounded bg-cosmos-surface3 px-1.5 py-0.5 font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
