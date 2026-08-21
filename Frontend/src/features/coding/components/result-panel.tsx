"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Terminal,
} from "lucide-react";
import type { CodingSubmission, RunCodeResponse } from "@/types/contracts/coding";

export function ResultPanel({
  runResponse,
  submission,
  isExecuting,
}: {
  runResponse: RunCodeResponse | null;
  submission: CodingSubmission | null;
  isExecuting: boolean;
}) {
  const [activeCaseTab, setActiveCaseTab] = useState(0);

  if (isExecuting) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-3 text-center">
        <Loader2 className="animate-spin text-[var(--gold-300)]" size={28} />
        <div className="text-sm font-semibold text-[var(--text-primary)]">
          Executing code in sandbox...
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Running test cases against isolated environment
        </p>
      </div>
    );
  }

  // Submission Verdict Mode
  if (submission) {
    const isJudging = submission.status === "judging";

    if (isJudging) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 space-y-3 text-center">
          <Loader2 className="animate-spin text-[var(--gold-300)]" size={28} />
          <div className="text-sm font-semibold text-[var(--text-primary)]">Judging Submission...</div>
          <p className="text-xs text-[var(--text-muted)]">
            Evaluating all test cases on Piston engine
          </p>
        </div>
      );
    }

    const isAccepted = submission.status === "accepted";
    const statusLabels: Record<string, { title: string; color: string; bg: string }> = {
      accepted: {
        title: "Accepted",
        color: "text-emerald-400",
        bg: "bg-emerald-950/40 border-emerald-800/50",
      },
      wrong_answer: {
        title: "Wrong Answer",
        color: "text-rose-400",
        bg: "bg-rose-950/40 border-rose-800/50",
      },
      time_limit_exceeded: {
        title: "Time Limit Exceeded",
        color: "text-amber-400",
        bg: "bg-amber-950/40 border-amber-800/50",
      },
      runtime_error: {
        title: "Runtime Error",
        color: "text-orange-400",
        bg: "bg-orange-950/40 border-orange-800/50",
      },
      compile_error: {
        title: "Compile Error",
        color: "text-orange-400",
        bg: "bg-orange-950/40 border-orange-800/50",
      },
    };

    const currentConfig = statusLabels[submission.status] || {
      title: submission.status,
      color: "text-[var(--text-primary)]",
      bg: "bg-[var(--surface-strong)] border-[var(--border-subtle)]",
    };

    return (
      <div className="h-full flex flex-col p-4 space-y-4 text-xs overflow-y-auto">
        {/* Banner */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${currentConfig.bg}`}>
          <div className="flex items-center gap-3">
            {isAccepted ? (
              <CheckCircle2 size={24} className="text-emerald-400" />
            ) : (
              <XCircle size={24} className={currentConfig.color} />
            )}
            <div>
              <div className={`text-base font-bold ${currentConfig.color}`}>
                {currentConfig.title}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {submission.passedCount} / {submission.totalCount} testcases passed
              </div>
            </div>
          </div>

          {submission.runtimeMs !== null && submission.runtimeMs !== undefined && (
            <div className="text-right">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                Runtime
              </div>
              <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                {submission.runtimeMs} ms
              </div>
            </div>
          )}
        </div>

        {/* First Failure Details */}
        {submission.firstFailure && (
          <div className="p-3.5 rounded-lg bg-[var(--surface-strong)] border border-[var(--border-subtle)] space-y-2">
            <div className="text-xs font-semibold text-rose-400">Failed on Testcase:</div>
            <div className="space-y-1.5 font-mono text-xs bg-[var(--bg-primary)] p-3 rounded border border-[var(--border-subtle)]">
              <div>
                <span className="text-[var(--text-muted)] font-sans">Input: </span>
                <span className="text-[var(--text-primary)]">
                  {JSON.stringify(submission.firstFailure.inputArgs)}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] font-sans">Expected: </span>
                <span className="text-emerald-400">
                  {JSON.stringify(submission.firstFailure.expected)}
                </span>
              </div>
              {submission.firstFailure.actual !== undefined && (
                <div>
                  <span className="text-[var(--text-muted)] font-sans">Output: </span>
                  <span className="text-rose-400">
                    {JSON.stringify(submission.firstFailure.actual)}
                  </span>
                </div>
              )}
              {submission.firstFailure.error && (
                <div>
                  <span className="text-[var(--text-muted)] font-sans">Error: </span>
                  <span className="text-orange-400">{submission.firstFailure.error}</span>
                </div>
              )}
              {submission.firstFailure.debugOutput && (
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <div className="text-[11px] text-[var(--text-muted)] font-sans flex items-center gap-1 mb-1">
                    <Terminal size={11} /> Stdout
                  </div>
                  <pre className="text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap">
                    {submission.firstFailure.debugOutput}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compile Error Output */}
        {submission.compileStderr && (
          <div className="p-3.5 rounded-lg bg-orange-950/20 border border-orange-900/40 space-y-1.5">
            <div className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Error Output
            </div>
            <pre className="font-mono text-xs text-orange-300 p-2.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] overflow-x-auto whitespace-pre-wrap">
              {submission.compileStderr}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Run Code Results Mode
  if (runResponse) {
    if (runResponse.compileError) {
      return (
        <div className="h-full p-4 overflow-y-auto space-y-3 text-xs">
          <div className="p-3.5 rounded-lg bg-orange-950/20 border border-orange-900/40 space-y-1.5">
            <div className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Compilation / Execution Error
            </div>
            <pre className="font-mono text-xs text-orange-300 p-2.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] overflow-x-auto whitespace-pre-wrap">
              {runResponse.compileError}
            </pre>
          </div>
        </div>
      );
    }

    const results = runResponse.results || [];
    const allPassed = results.every((r) => r.passed);
    const activeResult = results[activeCaseTab] || results[0];

    return (
      <div className="h-full flex flex-col p-3 space-y-3 text-xs overflow-hidden">
        {/* Run Banner */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold flex items-center gap-1.5 ${
                allPassed ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {allPassed ? (
                <>
                  <CheckCircle2 size={16} /> All Tests Passed
                </>
              ) : (
                <>
                  <XCircle size={16} /> Wrong Answer
                </>
              )}
            </span>
          </div>

          {/* Case Selector Tabs */}
          <div className="flex items-center gap-1">
            {results.map((res, idx) => (
              <button
                key={idx}
                onClick={() => setActiveCaseTab(idx)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                  activeCaseTab === idx
                    ? "bg-[var(--surface-warm)] text-[var(--gold-300)] border border-[var(--border-gold)]"
                    : "bg-[var(--surface-strong)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    res.passed ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                Case {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Case Details */}
        {activeResult && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {/* Input */}
            <div className="space-y-1">
              <div className="text-[11px] text-[var(--text-muted)] font-semibold uppercase">
                Input
              </div>
              <pre className="p-2.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-primary)] overflow-x-auto">
                {JSON.stringify(activeResult.inputArgs)}
              </pre>
            </div>

            {/* Output vs Expected */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[11px] text-[var(--text-muted)] font-semibold uppercase">
                  Your Output
                </div>
                <pre
                  className={`p-2.5 rounded bg-[var(--bg-primary)] border font-mono text-xs overflow-x-auto ${
                    activeResult.passed
                      ? "border-emerald-800/40 text-emerald-300"
                      : "border-rose-800/40 text-rose-300"
                  }`}
                >
                  {activeResult.actual !== undefined
                    ? JSON.stringify(activeResult.actual)
                    : "null"}
                </pre>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-[var(--text-muted)] font-semibold uppercase">
                  Expected
                </div>
                <pre className="p-2.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] font-mono text-xs text-emerald-400 overflow-x-auto">
                  {activeResult.expected !== undefined
                    ? JSON.stringify(activeResult.expected)
                    : "null"}
                </pre>
              </div>
            </div>

            {/* Runtime */}
            {activeResult.runtimeMs !== undefined && (
              <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <Clock size={11} /> Runtime: {activeResult.runtimeMs} ms
              </div>
            )}

            {/* Stdout / Debug Output */}
            {activeResult.debugOutput && (
              <div className="space-y-1 pt-1">
                <div className="text-[11px] text-[var(--text-muted)] font-semibold uppercase flex items-center gap-1">
                  <Terminal size={11} /> Stdout
                </div>
                <pre className="p-2.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap">
                  {activeResult.debugOutput}
                </pre>
              </div>
            )}

            {/* Error */}
            {activeResult.error && (
              <div className="space-y-1 pt-1">
                <div className="text-[11px] text-rose-400 font-semibold uppercase flex items-center gap-1">
                  <AlertTriangle size={11} /> Runtime Error
                </div>
                <pre className="p-2.5 rounded bg-rose-950/20 border border-rose-900/40 font-mono text-xs text-rose-300 overflow-x-auto whitespace-pre-wrap">
                  {activeResult.error}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default Empty State
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--text-muted)] space-y-1">
      <p>You must run or submit your code first to see the evaluation result.</p>
    </div>
  );
}
