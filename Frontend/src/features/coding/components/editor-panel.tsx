"use client";

import { useEffect, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { RotateCcw, ZoomIn, ZoomOut, Check, Loader2 } from "lucide-react";
import type { CodingLanguage } from "@/types/contracts/coding";

export function EditorPanel({
  language,
  code,
  fontSize,
  isSavingDraft,
  hasDraftSaved,
  onChangeCode,
  onChangeLanguage,
  onResetCode,
  onChangeFontSize,
  onRun,
  onSubmit,
}: {
  language: CodingLanguage;
  code: string;
  fontSize: number;
  isSavingDraft: boolean;
  hasDraftSaved: boolean;
  onChangeCode: (newCode: string) => void;
  onChangeLanguage: (newLang: CodingLanguage) => void;
  onResetCode: () => void;
  onChangeFontSize: (delta: number) => void;
  onRun: () => void;
  onSubmit: () => void;
}) {
  const editorRef = useRef<unknown>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Register Command for Submit: Ctrl+Enter / Cmd+Enter
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onSubmit();
    });

    // Register Command for Run: Ctrl+' / Cmd+'
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Quote, () => {
      onRun();
    });
  };

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
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => onChangeLanguage(e.target.value as CodingLanguage)}
            className="px-2.5 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium outline-none focus:border-[var(--border-gold)] cursor-pointer"
          >
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript (Node.js)</option>
          </select>

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
      <div className="flex-1 w-full overflow-hidden">
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
      </div>
    </div>
  );
}
