const PRESETS = [
  { emoji: "✦", label: "Summarize",     goal: "Summarize the main content of this page in 3-5 bullet points" },
  { emoji: "⬡", label: "Extract data",  goal: "Extract all tables, lists, and structured data from this page as JSON" },
  { emoji: "⟟", label: "Fill form",     goal: "Fill in all empty form fields on this page with appropriate sample data" },
  { emoji: "⤢", label: "Get links",     goal: "Extract all important links from this page as a structured list" },
];

export function QuickActions({ onSelect, disabled }: { onSelect: (goal: string) => void; disabled: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map(({ emoji, label, goal }) => (
        <button
          key={label}
          disabled={disabled}
          onClick={() => onSelect(goal)}
          className="flex items-center gap-1.5 rounded-full border border-cosmos-border bg-cosmos-surface px-2.5 py-1 text-xs text-cosmos-textMuted transition-all duration-150 hover:border-cosmos-accent hover:text-cosmos-text hover:bg-cosmos-surface2 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="text-cosmos-accent font-medium leading-none">{emoji}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
