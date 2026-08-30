"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Lightbulb, Loader2, SendHorizonal, X } from "lucide-react";

export type CoachChatMessage = {
  role: "user" | "coach";
  text: string;
};

const QUICK_ACTIONS = [
  "Give me a concept nudge",
  "How should I approach this problem?",
  "Show me a pseudocode sketch",
];

export function AiCoachChat({
  messages,
  isThinking,
  error,
  onSend,
  onClose,
}: {
  messages: CoachChatMessage[];
  isThinking: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking, error]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;
    setDraft("");
    onSend(trimmed);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="glass-header flex items-center justify-between px-3.5 py-2.5 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Lightbulb size={14} className="text-[var(--gold-300)] shrink-0" />
          <span className="text-xs font-semibold text-[var(--gold-300)] tracking-wide">AI Coach</span>
          <span className="text-[11px] text-[var(--text-muted)] truncate">· chat while you solve</span>
        </div>
        <button
          onClick={onClose}
          title="Close coach"
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
        >
          <X size={14} />
        </button>
      </div>

      {/* Quick actions — the graduated ladder, one tap each */}
      <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 shrink-0">
        {QUICK_ACTIONS.map((q) => (
          <button
            key={q}
            onClick={() => submit(q)}
            disabled={isThinking}
            title="Send this to the coach"
            className="px-2.5 py-1 rounded-full text-[11px] border border-[var(--border-gold)] text-[var(--gold-300)] bg-[var(--surface-warm)] hover:brightness-110 transition disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Thread — independently scrollable even with 100+ messages */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-2.5">
        {messages.length === 0 && !isThinking && (
          <div className="text-[11px] text-[var(--text-muted)] leading-relaxed px-1 py-2">
            Stuck, curious, or just want a nudge? Ask anything about this problem — the coach
            never writes the full solution, so the win is still yours.
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed border ${
                  m.role === "user"
                    ? "bg-[var(--surface-warm)] border-[var(--border-gold)] text-[var(--text-primary)]"
                    : "bg-white/[0.05] border-[var(--border-subtle)] text-[var(--text-secondary)] [&_code]:text-[var(--gold-300)] [&_code]:bg-white/[0.07] [&_code]:px-1 [&_code]:rounded [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4 [&_p]:mb-1.5 [&_p:last-child]:mb-0"
                }`}
              >
                {m.role === "user" ? (
                  m.text
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                )}
              </div>
            </motion.div>
          ))}
          {isThinking && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="flex justify-start"
            >
              <div className="rounded-xl px-3 py-2 text-xs bg-white/[0.05] border border-[var(--border-subtle)] text-[var(--text-muted)] flex items-center gap-2">
                <Loader2 size={12} className="animate-spin text-[var(--gold-300)]" />
                <span>Coach is thinking…</span>
              </div>
            </motion.div>
          )}
          {error && (
            <div className="text-[11px] text-red-400 px-1 py-1" role="alert">
              {error}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-3 py-2.5 border-t border-white/[0.07] bg-white/[0.025] shrink-0">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(draft);
            }
          }}
          rows={2}
          placeholder="Ask the coach…"
          className="flex-1 resize-none rounded-lg bg-white/[0.04] border border-[var(--border-subtle)] focus:border-[var(--border-gold)] outline-none px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
        <button
          onClick={() => submit(draft)}
          disabled={isThinking || !draft.trim()}
          className="p-2 rounded-lg bg-gradient-to-r from-[var(--gold-400)] to-[var(--gold-500)] text-[var(--text-dark)] disabled:opacity-40 hover:brightness-110 transition"
          title="Send (Enter)"
        >
          <SendHorizonal size={14} />
        </button>
      </div>
    </div>
  );
}
