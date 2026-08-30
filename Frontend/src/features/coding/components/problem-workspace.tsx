"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  History,
  Play,
  Send,
  Loader2,
  CheckCircle2,
  Terminal,
} from "lucide-react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import {
  useCodingAssistMutation,
  useGetCodingProblemQuery,
  useGetDraftQuery,
  useRunCodeMutation,
  useSaveDraftMutation,
  useSubmissionPolling,
  useSubmitCodeMutation,
} from "@/services/api/coding.api";
import type {
  CodingAiError,
  CodingLanguage,
  RunCodeResponse,
} from "@/types/contracts/coding";
import { ProblemDescription } from "./problem-description";
import { EditorialPanel } from "./editorial-panel";
import { SubmissionsPanel } from "./submissions-panel";
import { EditorPanel } from "./editor-panel";
import { AiCoachChat, type CoachChatMessage } from "./ai-coach-chat";
import { TestCasePanel, type CustomTestCase } from "./testcase-panel";
import { ResultPanel } from "./result-panel";

export function ProblemWorkspace({ slug }: { slug: string }) {
  const { data: problem, isLoading, isError } = useGetCodingProblemQuery(slug);

  // Left Panel Tab: description | editorial | submissions
  const [leftTab, setLeftTab] = useState<"description" | "editorial" | "submissions">("description");

  // Right Bottom Tab: testcase | result
  const [bottomTab, setBottomTab] = useState<"testcase" | "result">("testcase");

  // Editor State
  const [language, setLanguage] = useState<CodingLanguage>("python");
  const [customCode, setCustomCode] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(14);

  // AI Assist State (error spotlight + coach chat)
  const [codingAssistMutation] = useCodingAssistMutation();
  const [aiErrors, setAiErrors] = useState<CodingAiError[]>([]);
  const lastDiagnosisKeyRef = useRef<string | null>(null);
  const [coachOpen, setCoachOpen] = useState<boolean>(false);
  const [coachMessages, setCoachMessages] = useState<CoachChatMessage[]>([]);
  const [coachThinking, setCoachThinking] = useState<boolean>(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  // Draft Management
  const { data: draftData } = useGetDraftQuery({ slug, language }, { skip: !slug });
  const [saveDraftMutation, { isLoading: isSavingDraft }] = useSaveDraftMutation();
  const [hasDraftSaved, setHasDraftSaved] = useState<boolean>(false);
  const draftTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Test Cases State
  const [customTestCases, setCustomTestCases] = useState<CustomTestCase[] | null>(null);

  // Execution & Submissions
  const [runCodeMutation, { isLoading: isRunning }] = useRunCodeMutation();
  const [submitCodeMutation, { isLoading: isSubmitting }] = useSubmitCodeMutation();
  const [runResponse, setRunResponse] = useState<RunCodeResponse | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const { submission, isLoading: isJudging } = useSubmissionPolling(activeSubmissionId);

  // Derive active code and test cases
  const code =
    customCode ?? draftData?.code ?? problem?.starterCode?.[language] ?? "";

  const testCases: CustomTestCase[] =
    customTestCases ??
    (problem?.testCases?.map((tc) => ({
      inputArgs: tc.inputArgs,
    })) || []);

  // Debounced draft autosave (1.5s after last keystroke)
  const handleCodeChange = (newCode: string) => {
    setCustomCode(newCode);
    setHasDraftSaved(false);
    // Stale AI squiggles are worse than none — clear on every edit.
    setAiErrors([]);
    lastDiagnosisKeyRef.current = null;

    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
    }

    draftTimerRef.current = setTimeout(async () => {
      try {
        await saveDraftMutation({ slug, body: { language, code: newCode } }).unwrap();
        setHasDraftSaved(true);
      } catch {
        // silent fail on autosave
      }
    }, 1500);
  };

  const handleLanguageChange = (newLang: CodingLanguage) => {
    setLanguage(newLang);
    setCustomCode(null);
    setAiErrors([]);
    lastDiagnosisKeyRef.current = null;
  };

  // After a failed run, ask the AI to pinpoint the offending line(s) so the editor
  // can draw squiggles. Same failing code + output is not re-billed to the LLM.
  const requestErrorDiagnosis = async (errorText: string) => {
    const key = `${code}::${errorText}`;
    if (key === lastDiagnosisKeyRef.current) return;
    lastDiagnosisKeyRef.current = key;
    try {
      const res = await codingAssistMutation({
        slug,
        body: { action: "explain_error", language, code, errorOutput: errorText },
      }).unwrap();
      setAiErrors(res.errors ?? []);
    } catch {
      // Best-effort diagnosis — the raw error is already visible in the result panel.
    }
  };

  // One turn of the coach conversation, grounded in the live editor buffer.
  const handleCoachSend = async (text: string) => {
    setCoachOpen(true);
    setCoachError(null);
    const history = coachMessages.slice(-12).map((m) => ({ role: m.role, text: m.text }));
    setCoachMessages((prev) => [...prev, { role: "user", text }]);
    setCoachThinking(true);
    try {
      const res = await codingAssistMutation({
        slug,
        body: { action: "coach_chat", language, code, message: text, history },
      }).unwrap();
      if (res.reply) {
        setCoachMessages((prev) => [...prev, { role: "coach", text: res.reply! }]);
      } else {
        setCoachError("The coach has no reply right now — try again in a moment.");
      }
    } catch (err) {
      const e = err as { data?: { error?: { message?: string } }; error?: { message?: string } };
      setCoachError(e?.data?.error?.message ?? e?.error?.message ?? "AI assist is unavailable right now.");
    } finally {
      setCoachThinking(false);
    }
  };

  const handleResetCode = () => {
    if (problem?.starterCode?.[language]) {
      setCustomCode(problem.starterCode[language]);
      saveDraftMutation({ slug, body: { language, code: problem.starterCode[language] } });
    }
  };

  const handleRun = async () => {
    setBottomTab("result");
    setActiveSubmissionId(null);
    try {
      const res = await runCodeMutation({
        slug,
        body: {
          language,
          code,
          testCases: testCases.map((tc) => ({ inputArgs: tc.inputArgs })),
        },
      }).unwrap();
      setRunResponse(res);

      // Failed compile or runtime error → AI spotlight on the offending line(s)
      const errorText =
        res.compileError ||
        res.results
          .map((r) => r.error)
          .find(Boolean) ||
        "";
      if (errorText) {
        void requestErrorDiagnosis(errorText);
      }
    } catch {
      setRunResponse({
        results: [],
        compileError: "Failed to connect to execution judge.",
      });
    }
  };

  const handleSubmit = async () => {
    setBottomTab("result");
    setRunResponse(null);
    try {
      const res = await submitCodeMutation({
        slug,
        body: {
          language,
          code,
        },
      }).unwrap();
      setActiveSubmissionId(res.submissionId);
    } catch {
      setActiveSubmissionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--gold-300)]" size={32} />
      </div>
    );
  }

  if (isError || !problem) {
    return (
      <div className="flex-1 min-h-0 h-full flex flex-col items-center justify-center space-y-4">
        <div className="text-lg font-semibold text-[var(--text-primary)]">Problem Not Found</div>
        <Link
          href="/coding"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--surface-warm)] text-[var(--gold-300)] border border-[var(--border-gold)] text-sm"
        >
          <ArrowLeft size={16} /> Back to Problems
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col p-2 md:p-3 gap-2 md:gap-3 overflow-hidden w-full">
      {/* Top Problem Navigation & Action Bar */}
      <div className="glass-pane glass-pane-gold flex items-center justify-between px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/coding"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface-strong)] hover:bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Problems</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--text-muted)]">#{problem.number}</span>
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[280px]">
              {problem.title}
            </span>
          </div>
        </div>

        {/* Run / Submit buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={isRunning || isSubmitting || isJudging}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-strong)] hover:bg-[var(--surface-hover)] text-xs font-medium text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all disabled:opacity-50 cursor-pointer"
            title="Run code (Ctrl + ')"
          >
            {isRunning ? (
              <Loader2 size={13} className="animate-spin text-[var(--gold-300)]" />
            ) : (
              <Play size={13} className="text-emerald-400 fill-emerald-400" />
            )}
            <span>Run</span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono ml-0.5">Ctrl+&apos;</span>
          </button>

          <button
            onClick={handleSubmit}
            disabled={isRunning || isSubmitting || isJudging}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[var(--gold-400)] to-[var(--gold-500)] hover:brightness-110 text-xs font-semibold text-[var(--text-dark)] shadow-[var(--shadow-gold)] transition-all disabled:opacity-50 cursor-pointer"
            title="Submit code (Ctrl + Enter)"
          >
            {isSubmitting || isJudging ? (
              <Loader2 size={13} className="animate-spin text-[var(--text-dark)]" />
            ) : (
              <Send size={13} />
            )}
            <span>Submit</span>
            <span className="text-[10px] text-black/60 font-mono ml-0.5">Ctrl+↵</span>
          </button>
        </div>
      </div>

      {/* Main Split Panels — 3 independently scrollable zones */}
      <div className="flex-1 w-full min-h-0 min-w-0 overflow-hidden">
        <PanelGroup orientation="horizontal" id="intervu-coding-h-split">
          {/* Left Panel: Problem Details & Tabs — independently scrollable */}
          <Panel
            defaultSize="45%"
            minSize="25%"
            className="glass-pane flex flex-col overflow-hidden min-h-0 min-w-0"
          >
            {/* Left Tabs Header */}
            <div className="glass-header flex items-center gap-1 px-3 pt-2 shrink-0">
              <button
                onClick={() => setLeftTab("description")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  leftTab === "description"
                    ? "border-[var(--gold-300)] text-[var(--gold-300)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                <FileText size={13} />
                <span>Description</span>
              </button>
              <button
                onClick={() => setLeftTab("editorial")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  leftTab === "editorial"
                    ? "border-[var(--gold-300)] text-[var(--gold-300)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                <BookOpen size={13} />
                <span>Editorial</span>
              </button>
              <button
                onClick={() => setLeftTab("submissions")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  leftTab === "submissions"
                    ? "border-[var(--gold-300)] text-[var(--gold-300)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                <History size={13} />
                <span>Submissions</span>
              </button>
            </div>

            {/* Left Content Body — own scroll container */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-5">
              {leftTab === "description" && <ProblemDescription problem={problem} />}
              {leftTab === "editorial" && <EditorialPanel editorialMd={problem.editorialMd} />}
              {leftTab === "submissions" && <SubmissionsPanel problemSlug={problem.slug} />}
            </div>
          </Panel>

          <PanelResizeHandle className="panel-handle panel-handle-x w-4 cursor-col-resize" />

          {/* Center Panel: Editor + Bottom Testcase/Result — each scrolls internally */}
          <Panel
            defaultSize="55%"
            minSize="30%"
            className="overflow-hidden min-h-0 min-w-0 flex flex-col"
          >
            <PanelGroup orientation="vertical" id="intervu-coding-v-split">
              {/* Editor Workspace — Monaco scrolls internally */}
              <Panel
                defaultSize="65%"
                minSize="30%"
                className="glass-pane overflow-hidden min-h-0 min-w-0 flex flex-col"
              >
                <EditorPanel
                  language={language}
                  code={code}
                  fontSize={fontSize}
                  isSavingDraft={isSavingDraft}
                  hasDraftSaved={hasDraftSaved}
                  aiErrors={aiErrors}
                  coachOpen={coachOpen}
                  onChangeCode={handleCodeChange}
                  onChangeLanguage={handleLanguageChange}
                  onResetCode={handleResetCode}
                  onChangeFontSize={(delta) => setFontSize((prev) => Math.max(10, Math.min(24, prev + delta)))}
                  onRun={handleRun}
                  onSubmit={handleSubmit}
                  onToggleCoach={() => setCoachOpen((prev) => !prev)}
                />
              </Panel>

              <PanelResizeHandle className="panel-handle panel-handle-y h-4 cursor-row-resize" />

              {/* Bottom Testcase & Result Panel — independently scrollable */}
              <Panel
                defaultSize="35%"
                minSize="20%"
                className="glass-pane flex flex-col overflow-hidden min-h-0 min-w-0"
              >
                {/* Bottom Tabs Header */}
                <div className="glass-header flex items-center justify-between px-3 pt-1 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setBottomTab("testcase")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                        bottomTab === "testcase"
                          ? "border-[var(--gold-300)] text-[var(--gold-300)]"
                          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      <Terminal size={12} />
                      <span>Testcase</span>
                    </button>
                    <button
                      onClick={() => setBottomTab("result")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                        bottomTab === "result"
                          ? "border-[var(--gold-300)] text-[var(--gold-300)]"
                          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      <CheckCircle2 size={12} />
                      <span>Result</span>
                      {(isRunning || isSubmitting || isJudging) && (
                        <Loader2 size={11} className="animate-spin text-[var(--gold-300)] ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom Content Body — inner panels handle their own scroll */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  {bottomTab === "testcase" && (
                    <TestCasePanel
                      params={problem.params}
                      testCases={testCases}
                      onChangeTestCases={setCustomTestCases}
                    />
                  )}
                  {bottomTab === "result" && (
                    <ResultPanel
                      runResponse={runResponse}
                      submission={submission || null}
                      isExecuting={isRunning || isSubmitting || isJudging}
                    />
                  )}
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          {/* Right Panel: AI Coach chat — independently scrollable thread */}
          {coachOpen && (
            <>
              <PanelResizeHandle className="panel-handle panel-handle-x w-4 cursor-col-resize" />
              <Panel
                defaultSize="30%"
                minSize="18%"
                maxSize="45%"
                className="glass-pane glass-pane-gold overflow-hidden min-h-0 min-w-0 flex flex-col"
              >
                <AiCoachChat
                  messages={coachMessages}
                  isThinking={coachThinking}
                  error={coachError}
                  onSend={handleCoachSend}
                  onClose={() => setCoachOpen(false)}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}
