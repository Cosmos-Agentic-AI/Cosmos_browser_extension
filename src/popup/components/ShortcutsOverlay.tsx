const SHORTCUTS = [
  { keys: "Enter", action: "Send goal to Cosmos" },
  { keys: "Ctrl+Shift+Space", action: "Open / focus Cosmos panel" },
  { keys: "Escape", action: "Close shortcuts overlay" },
  { keys: "?", action: "Show this overlay (when input is empty)" },
  { keys: "↑ / ↓", action: "Navigate recent goals (on focus)" },
];

export function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-72 rounded-xl border border-cosmos-border bg-cosmos-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Keyboard shortcuts</h3>
          <button onClick={onClose} className="text-xs text-cosmos-textMuted hover:text-cosmos-text">
            ✕
          </button>
        </div>
        <dl className="space-y-2">
          {SHORTCUTS.map(({ keys, action }) => (
            <div key={keys} className="flex items-center justify-between gap-3">
              <dt className="shrink-0 rounded bg-cosmos-bg px-1.5 py-0.5 font-mono text-[11px] text-cosmos-accent">
                {keys}
              </dt>
              <dd className="text-right text-[11px] text-cosmos-textMuted">{action}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
