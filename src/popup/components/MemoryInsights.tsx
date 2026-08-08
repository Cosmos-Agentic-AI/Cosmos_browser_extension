export function MemoryInsights({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
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
    </div>
  );
}
