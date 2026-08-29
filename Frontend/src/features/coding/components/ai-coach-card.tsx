"use client";

import { AnimatePresence, motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Lightbulb, Loader2, X } from "lucide-react";
import type { ApproachHint } from "@/types/contracts/coding";

const LEVELS = [
  { level: 1, label: "1 · Concept", title: "What's the idea behind problems like this?" },
  { level: 2, label: "2 · Approach", title: "How do I tackle this specific problem?" },
  { level: 3, label: "3 · Pseudocode", title: "A plain-language pseudocode sketch (no real code)" },
] as const;

export function AiCoachCard({
  open,
  hint,
  loadingLevel,
  error,
  onSelectLevel,
  onClose,
}: {
  open: boolean;
  hint: ApproachHint | null;
  loadingLevel: number | null;
  error: string | null;
  onSelectLevel: (level: number) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute bottom-3 left-3 right-3 z-20 rounded-xl border border-[var(--border-gold)] bg-[var(--surface-strong)] shadow-[0_8px_32px_rgba(0,0,0,0.55)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface-warm)]">
            <div className="flex items-center gap-1.5 min-w-0">
              <Lightbulb size={13} className="text-[var(--gold-300)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--gold-300)] tracking-wide">
                AI Coach
              </span>
              {hint && !loadingLevel && (
                <span className="text-[11px] text-[var(--text-muted)] truncate ml-1">
                  — {hint.title}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              title="Close coach"
            >
              <X size={13} />
            </button>
          </div>

          {/* Graduated hint levels — each deeper level is an explicit opt-in */}
          <div className="flex items-center gap-1.5 px-3.5 pt-2">
            {LEVELS.map(({ level, label, title }) => {
              const active = hint?.level === level || loadingLevel === level;
              return (
                <button
                  key={level}
                  onClick={() => onSelectLevel(level)}
                  disabled={loadingLevel !== null}
                  title={title}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors disabled:opacity-50 ${
                    active
                      ? "border-[var(--border-gold)] bg-[var(--surface-warm)] text-[var(--gold-300)]"
                      : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div className="px-3.5 py-2.5 max-h-[220px] overflow-y-auto text-xs leading-relaxed text-[var(--text-secondary)] [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_code]:text-[var(--gold-300)] [&_code]:bg-[var(--surface-hover)] [&_code]:px-1 [&_code]:rounded">
            {loadingLevel !== null ? (
              <div className="flex items-center gap-2 py-2 text-[var(--text-muted)]">
                <Loader2 size={13} className="animate-spin text-[var(--gold-300)]" />
                <span>Coach is thinking…</span>
              </div>
            ) : error ? (
              <div className="py-2 text-red-400">{error}</div>
            ) : hint ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{hint.markdown}</ReactMarkdown>
            ) : (
              <div className="py-2 text-[var(--text-muted)]">
                Pick a level above — start with the concept, go deeper only when you&apos;re ready.
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
