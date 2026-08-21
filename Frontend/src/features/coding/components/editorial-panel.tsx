"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen } from "lucide-react";

export function EditorialPanel({ editorialMd }: { editorialMd: string }) {
  if (!editorialMd) {
    return (
      <div className="p-8 text-center text-[var(--text-muted)] space-y-2">
        <BookOpen className="mx-auto text-[var(--text-muted)]" size={24} />
        <p>No editorial available for this problem yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
        <BookOpen className="text-[var(--gold-300)]" size={16} />
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          Official Editorial & Approaches
        </h2>
      </div>

      <div className="prose prose-invert prose-sm max-w-none space-y-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2 mb-3">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-base font-semibold text-[var(--text-primary)] mt-4 mb-2">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-sm font-semibold text-[var(--gold-200)] mt-3 mb-1.5">
                {children}
              </h3>
            ),
            p: ({ children }) => <p className="mb-3 text-[var(--text-secondary)]">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-[var(--text-secondary)]">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-[var(--text-secondary)]">{children}</ol>,
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
                <div className="my-3 rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                  <pre className="p-3.5 font-mono text-xs text-[var(--text-primary)] overflow-x-auto">
                    <code {...props}>{children}</code>
                  </pre>
                </div>
              );
            },
          }}
        >
          {editorialMd}
        </ReactMarkdown>
      </div>
    </div>
  );
}
