"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckCircle2, Clock, Hash, Tag } from "lucide-react";
import type { ProblemDetail } from "@/types/contracts/coding";

export function ProblemDescription({ problem }: { problem: ProblemDetail }) {
  const difficultyColors = {
    easy: "text-emerald-400 bg-emerald-950/60 border-emerald-800/60",
    medium: "text-amber-400 bg-amber-950/60 border-amber-800/60",
    hard: "text-rose-400 bg-rose-950/60 border-rose-800/60",
  }[problem.difficulty];

  return (
    <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
      {/* Header Info */}
      <div className="border-b border-[var(--border-subtle)] pb-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1">
            <Hash size={13} /> {problem.number}
          </span>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {problem.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span
            className={`px-2.5 py-0.5 text-xs font-medium rounded-full border capitalize ${difficultyColors}`}
          >
            {problem.difficulty}
          </span>
          {problem.userStatus === "solved" && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
              <CheckCircle2 size={12} /> Solved
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--surface-strong)] border border-[var(--border-subtle)]">
            <Clock size={12} /> {problem.timeLimitMs}ms limit
          </span>
        </div>

        {/* Topics */}
        {problem.topics.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Tag size={12} className="text-[var(--text-muted)]" />
            {problem.topics.map((topic) => (
              <span
                key={topic}
                className="text-xs px-2 py-0.5 rounded-md bg-[var(--surface-warm)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Description Markdown */}
      <div className="prose prose-invert prose-sm max-w-none space-y-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-3 text-[var(--text-secondary)]">{children}</p>,
            code: ({ inline, children, ...props }: React.ComponentPropsWithoutRef<"code"> & { inline?: boolean }) => {
              if (inline) {
                return (
                  <code
                    className="px-1.5 py-0.5 font-mono text-xs rounded bg-[var(--surface-strong)] text-[var(--gold-200)] border border-[var(--border-subtle)]"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <code
                  className="block p-3 font-mono text-xs rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-subtle)] overflow-x-auto my-2"
                  {...props}
                >
                  {children}
                </code>
              );
            },
          }}
        >
          {problem.descriptionMd}
        </ReactMarkdown>
      </div>

      {/* Examples */}
      {problem.examples && problem.examples.length > 0 && (
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide uppercase">
            Examples
          </h2>
          <div className="space-y-3">
            {problem.examples.map((example, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-[var(--surface-strong)] border border-[var(--border-subtle)] space-y-2"
              >
                <div className="text-xs font-semibold text-[var(--gold-300)]">
                  Example {idx + 1}:
                </div>
                <div className="font-mono text-xs space-y-1 bg-[var(--bg-primary)] p-2.5 rounded border border-[var(--border-subtle)]">
                  <div>
                    <span className="text-[var(--text-muted)] font-sans">Input: </span>
                    <span className="text-[var(--text-primary)]">{example.input}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] font-sans">Output: </span>
                    <span className="text-[var(--text-primary)]">{example.output}</span>
                  </div>
                  {example.explanation && (
                    <div className="pt-1 text-[var(--text-secondary)] font-sans text-xs border-t border-[var(--border-subtle)]">
                      <span className="text-[var(--text-muted)] font-sans">Explanation: </span>
                      {example.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Constraints */}
      {problem.constraintsMd && (
        <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide uppercase">
            Constraints
          </h2>
          <div className="prose prose-invert prose-sm text-xs max-w-none text-[var(--text-secondary)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {problem.constraintsMd}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
