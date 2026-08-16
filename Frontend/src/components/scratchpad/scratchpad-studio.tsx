"use client";

import { useEffect, useState } from "react";
import {
  Braces,
  Database,
  FileText,
  Network,
  Play,
  RotateCcw,
  Terminal,
} from "lucide-react";
import { CodeEditor } from "./code-editor";
import { SqlStudio } from "./sql-studio";
import { ArchitectureCanvas } from "./architecture-canvas";
import {
  runCodeSandbox,
  STARTER_TEMPLATES,
  type ExecutionResult,
} from "@/lib/scratchpad/runner";
import type { CodeArtifact } from "@/types/realtime";
import styles from "./scratchpad.module.css";

export type StudioTab = "code" | "sql" | "architecture" | "notes";

export interface ScratchpadStudioProps {
  initialTab?: StudioTab;
  onArtifactChange?: (artifact: CodeArtifact) => void;
  questionTopic?: string;
}

function getInitialTab(initialTab: StudioTab, questionTopic?: string): StudioTab {
  if (!questionTopic) return initialTab;
  const topic = questionTopic.toLowerCase();
  if (topic.includes("sql") || topic.includes("database")) return "sql";
  if (topic.includes("system") || topic.includes("distributed") || topic.includes("architecture")) return "architecture";
  if (topic.includes("behavioral") || topic.includes("ownership")) return "notes";
  return initialTab;
}

export function ScratchpadStudio({
  initialTab = "code",
  onArtifactChange,
  questionTopic,
}: ScratchpadStudioProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>(() =>
    getInitialTab(initialTab, questionTopic)
  );
  const [language, setLanguage] = useState<string>("typescript");

  const [codeContent, setCodeContent] = useState<string>(
    () => STARTER_TEMPLATES.lru_cache.code
  );
  const [sqlContent, setSqlContent] = useState<string>(
    () => STARTER_TEMPLATES.sql_top_users.code
  );
  const [archContent, setArchContent] = useState<string>(
    () => STARTER_TEMPLATES.system_architecture.code
  );
  const [notesContent, setNotesContent] = useState<string>(
    () => STARTER_TEMPLATES.star_notes.code
  );

  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [showConsole, setShowConsole] = useState<boolean>(true);

  // Notify parent of active code artifact
  useEffect(() => {
    let content = codeContent;
    let lang = language;

    if (activeTab === "sql") {
      content = sqlContent;
      lang = "sql";
    } else if (activeTab === "architecture") {
      content = archContent;
      lang = "markdown";
    } else if (activeTab === "notes") {
      content = notesContent;
      lang = "markdown";
    }

    onArtifactChange?.({
      type: activeTab,
      language: lang,
      content,
      executionOutput: executionResult?.output,
    });
  }, [
    activeTab,
    archContent,
    codeContent,
    executionResult?.output,
    language,
    notesContent,
    onArtifactChange,
    sqlContent,
  ]);

  const runCode = () => {
    if (activeTab === "code") {
      setShowConsole(true);
      const res = runCodeSandbox(codeContent);
      setExecutionResult(res);
    }
  };

  const handleTemplateSelect = (key: string) => {
    if (!key) return;
    const template = STARTER_TEMPLATES[key as keyof typeof STARTER_TEMPLATES];
    if (!template) return;

    if (template.type === "code") {
      setActiveTab("code");
      setCodeContent(template.code);
      setLanguage(template.language);
    } else if (template.type === "sql") {
      setActiveTab("sql");
      setSqlContent(template.code);
    } else if (template.type === "architecture") {
      setActiveTab("architecture");
      setArchContent(template.code);
    } else if (template.type === "notes") {
      setActiveTab("notes");
      setNotesContent(template.code);
    }
  };

  const handleReset = () => {
    if (activeTab === "code") setCodeContent("// Write your implementation here...\n");
    if (activeTab === "sql") setSqlContent("-- Write SQL query here...\n");
    if (activeTab === "architecture") setArchContent("graph TD\n    Client --> LB\n");
    if (activeTab === "notes") setNotesContent("### [Constraints & Decisions]\n");
    setExecutionResult(null);
  };

  return (
    <section className={styles.studioContainer} aria-label="Interactive live scratchpad studio">
      <header className={styles.studioHeader}>
        <div className={styles.studioTabs} role="tablist">
          <button
            type="button"
            className={styles.studioTabButton}
            data-active={activeTab === "code"}
            onClick={() => setActiveTab("code")}
            role="tab"
            aria-selected={activeTab === "code"}
          >
            <Braces size={14} />
            <span>Code Sandbox</span>
          </button>
          <button
            type="button"
            className={styles.studioTabButton}
            data-active={activeTab === "sql"}
            onClick={() => setActiveTab("sql")}
            role="tab"
            aria-selected={activeTab === "sql"}
          >
            <Database size={14} />
            <span>SQL Studio</span>
          </button>
          <button
            type="button"
            className={styles.studioTabButton}
            data-active={activeTab === "architecture"}
            onClick={() => setActiveTab("architecture")}
            role="tab"
            aria-selected={activeTab === "architecture"}
          >
            <Network size={14} />
            <span>Architecture</span>
          </button>
          <button
            type="button"
            className={styles.studioTabButton}
            data-active={activeTab === "notes"}
            onClick={() => setActiveTab("notes")}
            role="tab"
            aria-selected={activeTab === "notes"}
          >
            <FileText size={14} />
            <span>STAR Notes</span>
          </button>
        </div>

        <div className={styles.studioActions}>
          {activeTab === "code" && (
            <select
              className={styles.langSelect}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Code language"
            >
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
            </select>
          )}

          <select
            className={styles.templateSelect}
            defaultValue=""
            onChange={(e) => handleTemplateSelect(e.target.value)}
            aria-label="Starter templates"
          >
            <option value="" disabled>
              Load Template…
            </option>
            <option value="lru_cache">LRU Cache (TS)</option>
            <option value="rate_limiter">Token Bucket Rate Limiter (TS)</option>
            <option value="sql_top_users">SQL Active Users</option>
            <option value="system_architecture">Distributed Cache Topology</option>
            <option value="star_notes">STAR Trade-off Notes</option>
          </select>

          {activeTab === "code" && (
            <button
              type="button"
              className={styles.runButton}
              onClick={runCode}
              title="Run Code (⌘ + Enter)"
            >
              <Play size={13} fill="currentColor" />
              <span>Run</span>
            </button>
          )}

          <button
            type="button"
            className={styles.studioTabButton}
            onClick={handleReset}
            title="Reset active editor"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </header>

      <div className={styles.studioBody}>
        {activeTab === "code" && (
          <CodeEditor
            value={codeContent}
            onChange={setCodeContent}
            language={language}
            onRun={runCode}
          />
        )}

        {activeTab === "sql" && (
          <SqlStudio value={sqlContent} onChange={setSqlContent} />
        )}

        {activeTab === "architecture" && (
          <ArchitectureCanvas value={archContent} onChange={setArchContent} />
        )}

        {activeTab === "notes" && (
          <CodeEditor
            value={notesContent}
            onChange={setNotesContent}
            language="markdown"
          />
        )}
      </div>

      {activeTab === "code" && showConsole && executionResult && (
        <div className={styles.consoleDrawer}>
          <div className={styles.consoleHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Terminal size={13} />
              <span>Execution Output ({executionResult.executionTimeMs}ms)</span>
            </div>
            <button
              type="button"
              className="quiet-button"
              style={{ fontSize: "0.68rem" }}
              onClick={() => setShowConsole(false)}
            >
              Close
            </button>
          </div>
          <div
            className={styles.consoleOutput}
            data-error={!executionResult.success}
          >
            {executionResult.error ? (
              <>{executionResult.error}</>
            ) : (
              <>{executionResult.output}</>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
