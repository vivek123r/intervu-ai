"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Code2,
  Award,
  Zap,
  Target,
  ChevronRight,
} from "lucide-react";
import { useGetCodingStatsQuery } from "@/services/api/coding.api";

export function CodingStatsView() {
  const { data: stats, isLoading } = useGetCodingStatsQuery();

  if (isLoading || !stats) {
    return (
      <div className="p-12 text-center text-sm text-[var(--text-muted)] animate-pulse">
        Loading coding statistics...
      </div>
    );
  }

  const easyPct = stats.easyTotal > 0 ? Math.round((stats.easySolved / stats.easyTotal) * 100) : 0;
  const medPct = stats.mediumTotal > 0 ? Math.round((stats.mediumSolved / stats.mediumTotal) * 100) : 0;
  const hardPct = stats.hardTotal > 0 ? Math.round((stats.hardSolved / stats.hardTotal) * 100) : 0;
  const totalPct = stats.totalProblems > 0 ? Math.round((stats.totalSolved / stats.totalProblems) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/coding"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-strong)] hover:bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Problem List</span>
          </Link>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Award className="text-[var(--gold-300)]" size={20} />
            <span>Coding Practice Analytics</span>
          </h1>
        </div>
      </div>

      {/* Summary Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Solved Card */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
            <span>Total Solved</span>
            <Target size={15} className="text-[var(--gold-300)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-mono">
            {stats.totalSolved}
            <span className="text-xs font-normal text-[var(--text-muted)] font-sans">
              {" "}
              / {stats.totalProblems}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--gold-400)] to-[var(--gold-300)] rounded-full"
              style={{ width: `${totalPct}%` }}
            />
          </div>
          <div className="text-[11px] text-[var(--text-muted)] pt-0.5">{totalPct}% completed</div>
        </div>

        {/* Easy Card */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
            <span className="text-emerald-400 font-semibold">Easy</span>
            <span className="text-[11px] font-mono text-emerald-400">{easyPct}%</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {stats.easySolved}
            <span className="text-xs font-normal text-[var(--text-muted)] font-sans">
              {" "}
              / {stats.easyTotal}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${easyPct}%` }} />
          </div>
        </div>

        {/* Medium Card */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
            <span className="text-amber-400 font-semibold">Medium</span>
            <span className="text-[11px] font-mono text-amber-400">{medPct}%</span>
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {stats.mediumSolved}
            <span className="text-xs font-normal text-[var(--text-muted)] font-sans">
              {" "}
              / {stats.mediumTotal}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${medPct}%` }} />
          </div>
        </div>

        {/* Hard Card */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
            <span className="text-rose-400 font-semibold">Hard</span>
            <span className="text-[11px] font-mono text-rose-400">{hardPct}%</span>
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">
            {stats.hardSolved}
            <span className="text-xs font-normal text-[var(--text-muted)] font-sans">
              {" "}
              / {stats.hardTotal}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
            <div className="h-full bg-rose-400 rounded-full" style={{ width: `${hardPct}%` }} />
          </div>
        </div>
      </div>

      {/* Topic Mastery & Breakdown */}
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] space-y-5 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="text-[var(--gold-300)]" size={16} />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Topic Breakdown & Proficiency
            </h2>
          </div>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            Acceptance: {stats.acceptanceRate}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.topicStats.map((item) => {
            const pct = item.total > 0 ? Math.round((item.solved / item.total) * 100) : 0;

            return (
              <div
                key={item.topic}
                className="p-3.5 rounded-xl bg-[var(--surface-strong)] border border-[var(--border-subtle)] space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--text-primary)]">{item.topic}</span>
                  <span className="font-mono text-[var(--text-muted)]">
                    {item.solved} / {item.total} ({pct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--gold-300)] rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Submissions */}
      {stats.recentSubmissions && stats.recentSubmissions.length > 0 && (
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] space-y-4 backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
            <Zap className="text-[var(--gold-300)]" size={16} />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Recent Submissions
            </h2>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {stats.recentSubmissions.map((sub) => {
              const isAccepted = sub.status === "accepted";
              const timeAgo = new Date(sub.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={sub.id}
                  className="py-3 flex items-center justify-between hover:bg-[var(--surface-hover)] px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isAccepted ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <XCircle size={16} className="text-rose-400" />
                    )}
                    <div>
                      <Link
                        href={`/coding/problems/${sub.problemSlug}`}
                        className="text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--gold-300)] transition-colors"
                      >
                        {sub.problemTitle}
                      </Link>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] pt-0.5">
                        <span className="capitalize">{sub.difficulty}</span>
                        <span>•</span>
                        <span className="uppercase font-mono">{sub.language}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span className="font-mono">{timeAgo}</span>
                    <Link
                      href={`/coding/problems/${sub.problemSlug}`}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--gold-300)]"
                    >
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
