"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { FunctionParam } from "@/types/contracts/coding";

export interface CustomTestCase {
  inputArgs: unknown[];
}

export function TestCasePanel({
  params,
  testCases,
  onChangeTestCases,
}: {
  params: FunctionParam[];
  testCases: CustomTestCase[];
  onChangeTestCases: (cases: CustomTestCase[]) => void;
}) {
  const [activeTab, setActiveTab] = useState(0);

  const handleArgChange = (caseIdx: number, paramIdx: number, valStr: string) => {
    if (!testCases[caseIdx]) return;
    try {
      const parsed = JSON.parse(valStr);
      const newCases = [...testCases];
      const newArgs = [...(newCases[caseIdx]?.inputArgs || [])];
      newArgs[paramIdx] = parsed;
      newCases[caseIdx] = { inputArgs: newArgs };
      onChangeTestCases(newCases);
    } catch {
      // If parsing fails mid-typing, keep raw string temporarily if needed or handle
      const newCases = [...testCases];
      const newArgs = [...(newCases[caseIdx]?.inputArgs || [])];
      newArgs[paramIdx] = valStr;
      newCases[caseIdx] = { inputArgs: newArgs };
      onChangeTestCases(newCases);
    }
  };

  const handleAddCase = () => {
    if (testCases.length >= 5) return;
    const defaultArgs = params.map((p) => {
      if (p.type === "int") return 0;
      if (p.type === "float") return 0.0;
      if (p.type === "string") return "";
      if (p.type === "boolean") return false;
      if (p.type.startsWith("list_")) return [];
      return null;
    });
    onChangeTestCases([...testCases, { inputArgs: defaultArgs }]);
    setActiveTab(testCases.length);
  };

  const handleDeleteCase = (idx: number) => {
    if (testCases.length <= 1) return;
    const newCases = testCases.filter((_, i) => i !== idx);
    onChangeTestCases(newCases);
    setActiveTab((prev) => Math.min(prev, newCases.length - 1));
  };

  const currentCase = testCases[activeTab] || testCases[0];

  return (
    <div className="h-full flex flex-col p-3 space-y-3 text-xs">
      {/* Case Tabs Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {testCases.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeTab === idx
                  ? "bg-[var(--surface-warm)] text-[var(--gold-300)] border border-[var(--border-gold)]"
                  : "bg-[var(--surface-strong)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-subtle)]"
              }`}
            >
              Case {idx + 1}
            </button>
          ))}
          {testCases.length < 5 && (
            <button
              onClick={handleAddCase}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--gold-300)] hover:bg-[var(--surface-hover)] transition-colors"
              title="Add Testcase"
            >
              <Plus size={15} />
            </button>
          )}
        </div>

        {testCases.length > 1 && (
          <button
            onClick={() => handleDeleteCase(activeTab)}
            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-rose-400 p-1 rounded hover:bg-rose-950/30 transition-colors"
            title="Delete this testcase"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Inputs for Current Case */}
      {currentCase && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {params.map((param, pIdx) => {
            const rawVal = currentCase.inputArgs[pIdx];
            const displayVal =
              typeof rawVal === "string" ? rawVal : JSON.stringify(rawVal);

            return (
              <div key={param.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[var(--text-secondary)] font-medium">
                    {param.name} =
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    {param.type}
                  </span>
                </div>
                <input
                  type="text"
                  value={displayVal ?? ""}
                  onChange={(e) => handleArgChange(activeTab, pIdx, e.target.value)}
                  placeholder={`e.g. ${param.type === "list_int" ? "[1, 2, 3]" : "value"}`}
                  className="w-full px-3 py-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] focus:border-[var(--border-gold)] font-mono text-xs text-[var(--text-primary)] outline-none transition-colors"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
