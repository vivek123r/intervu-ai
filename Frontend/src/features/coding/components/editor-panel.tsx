"use client";

import { useEffect, useRef, useState } from "react";
import type * as MonacoNs from "monaco-editor";
import Editor, { OnMount } from "@monaco-editor/react";
import { RotateCcw, Sparkles, ZoomIn, ZoomOut, Check, Loader2 } from "lucide-react";
import { CustomSelect } from "@/components/ui/select";
import { AiCoachCard } from "./ai-coach-card";
import type { ApproachHint, CodingAiError, CodingLanguage } from "@/types/contracts/coding";

const AI_MARKER_OWNER = "intervu-ai-assist";

const CODING_LANGUAGES: Array<{ value: CodingLanguage; label: string }> = [
  { value: "python", label: "Python 3" },
  { value: "javascript", label: "JavaScript (Node.js)" },
];

export function EditorPanel({
  language,
  code,
  fontSize,
  isSavingDraft,
  hasDraftSaved,
  aiErrors,
  coachOpen,
  coachHint,
  coachLoadingLevel,
  coachError,
  onChangeCode,
  onChangeLanguage,
  onResetCode,
  onChangeFontSize,
  onRun,
  onSubmit,
  onToggleCoach,
  onSelectCoachLevel,
  onCloseCoach,
}: {
  language: CodingLanguage;
  code: string;
  fontSize: number;
  isSavingDraft: boolean;
  hasDraftSaved: boolean;
  aiErrors: CodingAiError[];
  coachOpen: boolean;
  coachHint: ApproachHint | null;
  coachLoadingLevel: number | null;
  coachError: string | null;
  onChangeCode: (newCode: string) => void;
  onChangeLanguage: (newLang: CodingLanguage) => void;
  onResetCode: () => void;
  onChangeFontSize: (delta: number) => void;
  onRun: () => void;
  onSubmit: () => void;
  onToggleCoach: () => void;
  onSelectCoachLevel: (level: number) => void;
  onCloseCoach: () => void;
}) {
  const editorRef = useRef<MonacoNs.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof MonacoNs | null>(null);
  const disposablesRef = useRef<MonacoNs.IDisposable[]>([]);
  const aiErrorsRef = useRef<CodingAiError[]>([]);
  const [monacoReady, setMonacoReady] = useState(false);

  useEffect(() => {
    aiErrorsRef.current = aiErrors;
  }, [aiErrors]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register Command for Submit: Ctrl+Enter / Cmd+Enter
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onSubmit();
    });

    // Register Command for Run: Ctrl+' / Cmd+'
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Quote, () => {
      onRun();
    });

    // AI quick fixes: the lightbulb on an AI squiggle offers a one-click Replace.
    for (const lang of ["python", "javascript"]) {
      disposablesRef.current.push(
        monaco.languages.registerCodeActionProvider(lang, {
          provideCodeActions: (
            model: MonacoNs.editor.ITextModel,
            range: MonacoNs.Range,
          ): MonacoNs.languages.CodeActionList => {
            const fixable = aiErrorsRef.current.filter((err) => err.fix);
            // Lightbulb context: offer the fix for whichever AI squiggle line the
            // cursor is on (aiErrors only ever contains our own markers).
            const relevant = fixable.filter(
              (err) => err.line >= range.startLineNumber && err.line <= range.endLineNumber
            );

            const actions = relevant.map((err) => {
              const fix = err.fix!;
              const line = Math.min(Math.max(1, err.line), model.getLineCount());
              const lineContent = model.getLineContent(line);
              let startColumn = 1;
              let endColumn = model.getLineMaxColumn(line);
              if (fix.original && lineContent.includes(fix.original)) {
                startColumn = lineContent.indexOf(fix.original) + 1;
                endColumn = startColumn + fix.original.length;
              }

              const preview =
                fix.replacement.length > 48
                  ? `${fix.replacement.slice(0, 48)}…`
                  : fix.replacement;
              return {
                title: `AI fix: ${preview}`,
                kind: "quickfix",
                isPreferred: true,
                edit: {
                  edits: [
                    {
                      resource: model.uri,
                      versionId: model.getVersionId(),
                      textEdit: {
                        range: {
                          startLineNumber: line,
                          endLineNumber: line,
                          startColumn,
                          endColumn,
                        },
                        text: fix.replacement,
                      },
                    },
                  ],
                },
              };
            });
            return { actions, dispose: () => {} };
          },
        })
      );
    }

    setMonacoReady(true);
  };

  // Apply / clear AI squiggle markers whenever the diagnosis changes.
  useEffect(() => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monacoReady || !monaco || !editor) return;
    const model = editor.getModel();
    if (!model) return;

    if (aiErrors.length === 0) {
      monaco.editor.setModelMarkers(model, AI_MARKER_OWNER, []);
      return;
    }

    const markers: MonacoNs.editor.IMarkerData[] = aiErrors.map((err) => {
      const line = Math.min(Math.max(1, err.line), model.getLineCount());
      const lineLength = model.getLineMaxColumn(line) - 1;
      const spanEnd = Math.max(1, lineLength);
      const column = Math.min(Math.max(1, err.column ?? 1), spanEnd);
      const span = Math.max(1, spanEnd - column + 1);
      const length = err.length && err.length > 0 ? Math.min(err.length, span) : Math.min(span, 40);
      const message = err.explanation ? `${err.message}\n\n${err.explanation}` : err.message;
      return {
        startLineNumber: line,
        endLineNumber: line,
        startColumn: column,
        endColumn: column + length,
        message,
        severity: monaco.MarkerSeverity.Error,
        source: "AI Assist",
      };
    });
    monaco.editor.setModelMarkers(model, AI_MARKER_OWNER, markers);
  }, [aiErrors, monacoReady, language]);

  // Dispose the code-action providers on unmount.
  useEffect(() => {
    const disposables = disposablesRef.current;
    return () => {
      disposables.forEach((d) => d.dispose());
    };
  }, []);

  // Keyboard shortcut listener on window for when focus is outside editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "'") {
        e.preventDefault();
        onRun();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRun, onSubmit]);

  const monacoLanguage = language === "python" ? "python" : "javascript";

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface-strong)] text-xs">
        {/* Language selector */}
        <div className="flex items-center gap-2 min-w-[170px]">
          <CustomSelect<CodingLanguage>
            size="compact"
            value={language}
            options={CODING_LANGUAGES}
            onChange={(val) => onChangeLanguage(val)}
          />

          {/* Draft status indicator */}
          <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] pl-2">
            {isSavingDraft ? (
              <>
                <Loader2 size={11} className="animate-spin text-[var(--gold-300)]" />
                <span>Saving...</span>
              </>
            ) : hasDraftSaved ? (
              <>
                <Check size={11} className="text-emerald-400" />
                <span>Saved</span>
              </>
            ) : null}
          </div>

          {/* AI Coach chip */}
          <button
            onClick={onToggleCoach}
            className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
              coachOpen
                ? "border-[var(--border-gold)] bg-[var(--surface-warm)] text-[var(--gold-300)]"
                : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            }`}
            title="AI Coach — how should you approach this problem?"
          >
            <Sparkles size={12} className="text-[var(--gold-300)]" />
            <span>Coach</span>
          </button>
        </div>

        {/* Actions (Reset, Font Zoom) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChangeFontSize(-1)}
            disabled={fontSize <= 10}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-30"
            title="Decrease font size"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] font-mono text-[var(--text-muted)] px-1">
            {fontSize}px
          </span>
          <button
            onClick={() => onChangeFontSize(1)}
            disabled={fontSize >= 24}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-30"
            title="Increase font size"
          >
            <ZoomIn size={14} />
          </button>

          <div className="w-[1px] h-3.5 bg-[var(--border-subtle)] mx-1" />

          <button
            onClick={onResetCode}
            className="flex items-center gap-1 px-2 py-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            title="Reset code to starter template"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="relative flex-1 w-full overflow-hidden">
        <Editor
          height="100%"
          language={monacoLanguage}
          value={code}
          theme="vs-dark"
          onChange={(val) => onChangeCode(val || "")}
          onMount={handleEditorDidMount}
          options={{
            fontSize,
            fontFamily: "var(--font-mono), Consolas, 'Courier New', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 4,
            padding: { top: 12, bottom: 12 },
            lineNumbersMinChars: 3,
            folding: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            renderLineHighlight: "all",
          }}
        />

        {/* AI Coach overlay */}
        <AiCoachCard
          open={coachOpen}
          hint={coachHint}
          loadingLevel={coachLoadingLevel}
          error={coachError}
          onSelectLevel={onSelectCoachLevel}
          onClose={onCloseCoach}
        />
      </div>
    </div>
  );
}
