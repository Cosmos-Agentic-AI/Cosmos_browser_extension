import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@shared/types/chat";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };
  return (
    <button
      onClick={copy}
      className="mt-1 self-end text-[10px] text-cosmos-textMuted opacity-0 transition-opacity group-hover:opacity-100 hover:text-cosmos-text"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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
          className={`group flex flex-col max-w-[85%] ${m.role === "user" ? "self-end items-end" : "self-start items-start"}`}
        >
          <div
            className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-cosmos-accent text-white"
                : "border border-cosmos-border bg-cosmos-surface text-cosmos-text"
            }`}
          >
            {m.content || (m.role === "assistant" ? "…" : "")}
          </div>
          {m.role === "assistant" && m.content && <CopyButton text={m.content} />}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
