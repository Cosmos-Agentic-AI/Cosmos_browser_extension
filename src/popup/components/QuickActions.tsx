const PRESETS = [
  { emoji: "📝", label: "Summarize", goal: "Summarize the main content of this page in 3-5 bullet points" },
  { emoji: "🔗", label: "Links", goal: "Extract all important links from this page as a structured list" },
  { emoji: "📋", label: "Fill form", goal: "Fill in all empty form fields on this page with appropriate sample data" },
  { emoji: "📊", label: "Extract data", goal: "Extract all tables, lists, and structured data from this page as JSON" },
];

export function QuickActions({ onSelect, disabled }: { onSelect: (goal: string) => void; disabled: boolean }) {
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {PRESETS.map(({ emoji, label, goal }) => (
        <button
          key={label}
          disabled={disabled}
          onClick={() => onSelect(goal)}
          className="flex items-center gap-1 rounded-full border border-cosmos-border bg-cosmos-surface px-2.5 py-1 text-[11px] text-cosmos-textMuted transition-colors hover:border-cosmos-accent hover:text-cosmos-text disabled:opacity-40"
        >
          <span>{emoji}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
