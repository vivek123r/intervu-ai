"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, AlertTriangle, ChevronRight, X } from "lucide-react";
import { useGetProblemSubmissionsQuery, useGetSubmissionQuery } from "@/services/api/coding.api";
import type { SubmissionStatus } from "@/types/contracts/coding";

export function SubmissionsPanel({ problemSlug }: { problemSlug: string }) {
  const { data: submissions = [], isLoading } = useGetProblemSubmissionsQuery(problemSlug);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const statusConfig: Record<
    SubmissionStatus,
    { label: string; icon: typeof CheckCircle2; color: string; bg: string }
  > = {
    accepted: {
      label: "Accepted",
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-950/40 border-emerald-800/50",
    },
    wrong_answer: {
      label: "Wrong Answer",
      icon: XCircle,
      color: "text-rose-400",
      bg: "bg-rose-950/40 border-rose-800/50",
    },
    time_limit_exceeded: {
      label: "Time Limit Exceeded",
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-950/40 border-amber-800/50",
    },
    runtime_error: {
      label: "Runtime Error",
      icon: AlertTriangle,
      color: "text-orange-400",
      bg: "bg-orange-950/40 border-orange-800/50",
    },
    compile_error: {
      label: "Compile Error",
      icon: AlertTriangle,
      color: "text-orange-400",
      bg: "bg-orange-950/40 border-orange-800/50",
    },
    judging: {
      label: "Judging...",
      icon: Clock,
      color: "text-[var(--gold-300)]",
      bg: "bg-[var(--surface-warm)] border-[var(--border-gold)]",
    },
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">
        Loading submissions...
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-[var(--text-muted)] space-y-2">
        <Clock className="mx-auto text-[var(--text-muted)]" size={24} />
        <p>No submissions yet for this problem.</p>
        <p className="text-xs">Click Run or Submit to test your code.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          My Submissions ({submissions.length})
        </h2>
      </div>

      <div className="space-y-2">
        {submissions.map((sub) => {
          const config = statusConfig[sub.status] || statusConfig.judging;
          const Icon = config.icon;
          const timeAgo = new Date(sub.createdAt).toLocaleString(undefined, {
            dateStyle: "short",
            timeStyle: "short",
          });

          return (
            <div
              key={sub.id}
              onClick={() => setSelectedSubmissionId(sub.id)}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-strong)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className={`p-1 rounded-full border ${config.bg}`}>
                  <Icon size={14} className={config.color} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-[var(--bg-primary)] text-[var(--text-muted)] uppercase font-mono">
                      {sub.language}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] pt-0.5">
                    {sub.passedCount} / {sub.totalCount} testcases passed
                    {sub.runtimeMs !== null && sub.runtimeMs !== undefined && (
                      <span> • {sub.runtimeMs} ms</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span>{timeAgo}</span>
                <ChevronRight size={14} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Submission Detail Modal */}
      {selectedSubmissionId && (
        <SubmissionDetailModal
          submissionId={selectedSubmissionId}
          onClose={() => setSelectedSubmissionId(null)}
        />
      )}
    </div>
  );
}

function SubmissionDetailModal({
  submissionId,
  onClose,
}: {
  submissionId: string;
  onClose: () => void;
}) {
  const { data: sub, isLoading } = useGetSubmissionQuery(submissionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-xl bg-[var(--surface-strong)] border border-[var(--border-strong)] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Submission Details
            </h3>
            {sub && (
              <span className="text-xs px-2 py-0.5 rounded capitalize bg-[var(--surface-warm)] text-[var(--gold-300)] font-mono border border-[var(--border-subtle)]">
                {sub.language}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          {isLoading || !sub ? (
            <div className="p-8 text-center text-[var(--text-muted)]">Loading details...</div>
          ) : (
            <>
              {/* Stats overview */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                  <div className="text-xs text-[var(--text-muted)]">Verdict</div>
                  <div className="text-sm font-semibold capitalize mt-0.5 text-[var(--text-primary)]">
                    {sub.status.replace("_", " ")}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                  <div className="text-xs text-[var(--text-muted)]">Passed Cases</div>
                  <div className="text-sm font-semibold mt-0.5 text-[var(--text-primary)]">
                    {sub.passedCount} / {sub.totalCount}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                  <div className="text-xs text-[var(--text-muted)]">Runtime</div>
                  <div className="text-sm font-semibold mt-0.5 text-[var(--text-primary)]">
                    {sub.runtimeMs ? `${sub.runtimeMs} ms` : "N/A"}
                  </div>
                </div>
              </div>

              {/* First Failure if any */}
              {sub.firstFailure && (
                <div className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-900/40 space-y-2">
                  <div className="text-xs font-semibold text-rose-400">First Failing Testcase</div>
                  <div className="font-mono text-xs space-y-1 bg-[var(--bg-primary)] p-2.5 rounded border border-[var(--border-subtle)]">
                    <div>
                      <span className="text-[var(--text-muted)] font-sans">Input: </span>
                      <span className="text-[var(--text-primary)]">
                        {JSON.stringify(sub.firstFailure.inputArgs)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] font-sans">Expected: </span>
                      <span className="text-emerald-400">
                        {JSON.stringify(sub.firstFailure.expected)}
                      </span>
                    </div>
                    {sub.firstFailure.actual !== undefined && (
                      <div>
                        <span className="text-[var(--text-muted)] font-sans">Output: </span>
                        <span className="text-rose-400">
                          {JSON.stringify(sub.firstFailure.actual)}
                        </span>
                      </div>
                    )}
                    {sub.firstFailure.error && (
                      <div>
                        <span className="text-[var(--text-muted)] font-sans">Error: </span>
                        <span className="text-orange-400">{sub.firstFailure.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Compile Error stderr */}
              {sub.compileStderr && (
                <div className="p-3.5 rounded-lg bg-orange-950/20 border border-orange-900/40 space-y-1.5">
                  <div className="text-xs font-semibold text-orange-400">Compile Error</div>
                  <pre className="font-mono text-xs text-orange-300 p-2.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] overflow-x-auto whitespace-pre-wrap">
                    {sub.compileStderr}
                  </pre>
                </div>
              )}

              {/* Submitted Code */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Submitted Code
                </div>
                <pre className="p-4 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-primary)] overflow-x-auto whitespace-pre-wrap">
                  {sub.code}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
