"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  MinusCircle,
  Circle,
  BookOpen,
  BarChart3,
  Tag,
  ArrowUpDown,
  Filter,
  Code2,
} from "lucide-react";
import {
  useGetCodingProblemsQuery,
  useGetCodingStatsQuery,
  useGetCodingTopicsQuery,
} from "@/services/api/coding.api";
import type { CodingDifficulty } from "@/types/contracts/coding";

export function ProblemList() {
  const [search, setSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"number" | "difficulty" | "title">("number");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const { data: problemsData, isLoading: isLoadingProblems } = useGetCodingProblemsQuery({
    difficulty: selectedDifficulty !== "all" ? selectedDifficulty : undefined,
    status:
      selectedStatus !== "all"
        ? (selectedStatus as "solved" | "attempted" | "todo")
        : undefined,
    search: search || undefined,
    topic: selectedTopics.length > 0 ? selectedTopics : undefined,
    sortBy,
    sortDir,
  });

  const { data: topics = [] } = useGetCodingTopicsQuery();
  const { data: stats } = useGetCodingStatsQuery();

  const handleToggleTopic = (topicName: string) => {
    if (selectedTopics.includes(topicName)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topicName));
    } else {
      setSelectedTopics([...selectedTopics, topicName]);
    }
  };

  const handleSortChange = (column: "number" | "difficulty" | "title") => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 1 ? -1 : 1));
    } else {
      setSortBy(column);
      setSortDir(1);
    }
  };

  const difficultyColors: Record<CodingDifficulty, string> = {
    easy: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40",
    medium: "text-amber-400 bg-amber-950/40 border-amber-800/40",
    hard: "text-rose-400 bg-rose-950/40 border-rose-800/40",
  };

  const problems = problemsData?.items || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hero Card */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-[var(--surface-warm)] text-[var(--gold-300)] border border-[var(--border-gold)]">
                <Code2 size={20} />
              </span>
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  Coding Practice & DSA Arena
                </h1>
                <p className="text-xs text-[var(--text-secondary)]">
                  Master data structures and algorithms with sandboxed test runner & editorials
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)] z-10">
            <div>
              <span className="font-semibold text-[var(--text-primary)] font-mono text-sm">
                30
              </span>{" "}
              Curated Problems
            </div>
            <span>•</span>
            <div>Python 3 & Node.js Supported</div>
            <span>•</span>
            <div>Zero AI, Pure Execution Sandbox</div>
          </div>
        </div>

        {/* Practice Stats Card */}
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] backdrop-blur-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Solved Progress
            </div>
            <Link
              href="/coding/stats"
              className="flex items-center gap-1 text-xs text-[var(--gold-300)] hover:underline font-medium"
            >
              <BarChart3 size={13} />
              <span>Full Analytics</span>
            </Link>
          </div>

          {stats ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-[var(--text-primary)] font-mono">
                  {stats.totalSolved}
                  <span className="text-sm font-normal text-[var(--text-muted)] font-sans">
                    {" "}
                    / {stats.totalProblems} Solved
                  </span>
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {stats.acceptanceRate}% Rate
                </span>
              </div>

              {/* Progress bars */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-medium">Easy</span>
                  <span className="text-[var(--text-muted)] font-mono">
                    {stats.easySolved} / {stats.easyTotal}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--bg-primary)] overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{
                      width: `${stats.easyTotal > 0 ? (stats.easySolved / stats.easyTotal) * 100 : 0}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-amber-400 font-medium">Medium</span>
                  <span className="text-[var(--text-muted)] font-mono">
                    {stats.mediumSolved} / {stats.mediumTotal}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--bg-primary)] overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{
                      width: `${stats.mediumTotal > 0 ? (stats.mediumSolved / stats.mediumTotal) * 100 : 0}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-rose-400 font-medium">Hard</span>
                  <span className="text-[var(--text-muted)] font-mono">
                    {stats.hardSolved} / {stats.hardTotal}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--bg-primary)] overflow-hidden">
                  <div
                    className="h-full bg-rose-400 rounded-full transition-all"
                    style={{
                      width: `${stats.hardTotal > 0 ? (stats.hardSolved / stats.hardTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[var(--text-muted)] py-4 text-center">
              Loading progress...
            </div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problem title, #, or tags..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--surface-strong)] border border-[var(--border-subtle)] focus:border-[var(--border-gold)] text-xs text-[var(--text-primary)] outline-none transition-colors"
            />
          </div>

          {/* Difficulty Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["all", "easy", "medium", "hard"].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  selectedDifficulty === diff
                    ? "bg-[var(--surface-warm)] text-[var(--gold-300)] border border-[var(--border-gold)]"
                    : "bg-[var(--surface-strong)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                }`}
              >
                {diff}
              </button>
            ))}

            {/* Status dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-strong)] text-[var(--text-secondary)] border border-[var(--border-subtle)] outline-none cursor-pointer focus:border-[var(--border-gold)] capitalize"
            >
              <option value="all">Status: All</option>
              <option value="solved">Solved</option>
              <option value="attempted">Attempted</option>
              <option value="todo">Todo</option>
            </select>
          </div>
        </div>

        {/* Topic Tag Chips */}
        {topics.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mr-1">
              <Tag size={12} /> Topics:
            </span>
            {topics.map((t) => {
              const isSelected = selectedTopics.includes(t.name);
              return (
                <button
                  key={t.name}
                  onClick={() => handleToggleTopic(t.name)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-[var(--surface-warm)] text-[var(--gold-300)] border border-[var(--border-gold)]"
                      : "bg-[var(--surface-strong)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                  }`}
                >
                  {t.name}{" "}
                  <span className="text-[10px] opacity-60 font-mono ml-0.5">
                    {t.count}
                  </span>
                </button>
              );
            })}
            {selectedTopics.length > 0 && (
              <button
                onClick={() => setSelectedTopics([])}
                className="text-[11px] text-[var(--text-muted)] hover:text-rose-400 ml-2 underline"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Problems Data Table */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] overflow-hidden shadow-sm">
        {isLoadingProblems ? (
          <div className="p-12 text-center text-sm text-[var(--text-muted)] animate-pulse">
            Loading problems...
          </div>
        ) : problems.length === 0 ? (
          <div className="p-12 text-center text-sm text-[var(--text-muted)] space-y-2">
            <Filter className="mx-auto text-[var(--text-muted)]" size={28} />
            <p>No problems match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-strong)] text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Status</th>
                  <th
                    className="py-3 px-4 w-16 cursor-pointer hover:text-[var(--text-primary)]"
                    onClick={() => handleSortChange("number")}
                  >
                    <div className="flex items-center gap-1">
                      <span>#</span>
                      {sortBy === "number" && <ArrowUpDown size={11} />}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-[var(--text-primary)]"
                    onClick={() => handleSortChange("title")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Title</span>
                      {sortBy === "title" && <ArrowUpDown size={11} />}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 w-28 cursor-pointer hover:text-[var(--text-primary)]"
                    onClick={() => handleSortChange("difficulty")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Difficulty</span>
                      {sortBy === "difficulty" && <ArrowUpDown size={11} />}
                    </div>
                  </th>
                  <th className="py-3 px-4 w-28">Acceptance</th>
                  <th className="py-3 px-4 hidden md:table-cell">Topics</th>
                  <th className="py-3 px-4 w-20 text-center">Solution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {problems.map((prob) => {
                  const isSolved = prob.status === "solved";
                  const isAttempted = prob.status === "attempted";

                  return (
                    <tr
                      key={prob.slug}
                      className="hover:bg-[var(--surface-hover)] transition-colors group"
                    >
                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isSolved ? (
                          <CheckCircle2 size={16} className="text-emerald-400 inline" />
                        ) : isAttempted ? (
                          <MinusCircle size={16} className="text-amber-400 inline" />
                        ) : (
                          <Circle size={15} className="text-[var(--border-strong)] inline" />
                        )}
                      </td>

                      {/* Number */}
                      <td className="py-3 px-4 font-mono text-[var(--text-muted)]">
                        {prob.number}
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4 font-medium">
                        <Link
                          href={`/coding/problems/${prob.slug}`}
                          className="text-[var(--text-primary)] hover:text-[var(--gold-300)] transition-colors flex items-center gap-1.5"
                        >
                          <span>{prob.title}</span>
                        </Link>
                      </td>

                      {/* Difficulty */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 text-[11px] font-medium rounded-full border capitalize ${
                            difficultyColors[prob.difficulty]
                          }`}
                        >
                          {prob.difficulty}
                        </span>
                      </td>

                      {/* Acceptance */}
                      <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">
                        {prob.acceptanceRate > 0 ? `${prob.acceptanceRate}%` : "—"}
                      </td>

                      {/* Topics */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {prob.topics.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-warm)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                            >
                              {t}
                            </span>
                          ))}
                          {prob.topics.length > 3 && (
                            <span className="text-[10px] text-[var(--text-muted)] self-center">
                              +{prob.topics.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Solution / Editorial */}
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/coding/problems/${prob.slug}`}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--gold-300)] inline-block"
                          title="View problem & editorial"
                        >
                          <BookOpen size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
