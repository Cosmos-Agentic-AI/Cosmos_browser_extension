import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@shared/types/chat";
import { IconCheck, IconCopy } from "./Icons";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };
  return (
    <button
      onClick={copy}
      title="Copy"
      className="mt-1 flex items-center gap-1 self-start opacity-0 group-hover:opacity-100 transition-opacity text-2xs text-cosmos-textMuted hover:text-cosmos-text"
    >
      {copied ? (
        <><IconCheck size={11} className="text-cosmos-success" /><span className="text-cosmos-success">Copied</span></>
      ) : (
        <><IconCopy size={11} /><span>Copy</span></>
      )}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="self-start flex items-center gap-2 rounded-2xl rounded-tl-sm border border-cosmos-border bg-cosmos-surface px-4 py-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-cosmos-textMuted animate-pulse-dot"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

export function MessageList({ messages, isThinking }: { messages: ChatMessage[]; isThinking?: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isThinking]);

  if (messages.length === 0 && !isThinking) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-bg shadow-glow">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M8 1 9.2 6.8 15 8l-5.8 1.2L8 15 6.8 9.2 1 8l5.8-1.2L8 1Z" fill="white" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-cosmos-text">What should I do?</p>
          <p className="mt-0.5 text-xs text-cosmos-textMuted text-balance">
            Describe a task and I'll plan and execute it on this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 py-1">
      {messages.map((m, i) => (
        <div
          key={m.id}
          className={`group flex flex-col animate-fade-in ${m.role === "user" ? "items-end" : "items-start"}`}
          style={{ animationDelay: `${Math.min(i * 0.03, 0.15)}s` }}
        >
          {m.role === "user" ? (
            <div className="max-w-[82%] rounded-2xl rounded-tr-sm gradient-bg px-3.5 py-2.5 text-sm text-white shadow-sm leading-relaxed">
              {m.content}
            </div>
          ) : (
            <>
              <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-cosmos-border bg-cosmos-surface px-3.5 py-2.5 text-sm text-cosmos-text shadow-sm leading-relaxed whitespace-pre-wrap">
                {m.content || "…"}
              </div>
              {m.content && <CopyButton text={m.content} />}
            </>
          )}
        </div>
      ))}
      {isThinking && (
        <div className="animate-slide-up">
          <TypingIndicator />
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
