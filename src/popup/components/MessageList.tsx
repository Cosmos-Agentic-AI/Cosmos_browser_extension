import { useEffect, useRef } from "react";
import { ChatMessage } from "@shared/types/chat";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center text-sm text-cosmos-textMuted">
        Tell Cosmos what to do on this page — "apply filters for remote jobs", "fill out this form", etc.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
            m.role === "user"
              ? "self-end bg-cosmos-accent text-white"
              : "self-start border border-cosmos-border bg-cosmos-surface text-cosmos-text"
          }`}
        >
          {m.content || (m.role === "assistant" ? "…" : "")}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
