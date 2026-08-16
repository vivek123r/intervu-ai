"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import styles from "./scratchpad.module.css";

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  onRun?: () => void;
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language = "typescript",
  onRun,
  readOnly = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeLine, setActiveLine] = useState(1);

  const lines = useMemo(() => {
    return value.split("\n");
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onRun?.();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);

      onChange(newValue);
      window.requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  const handleKeyUp = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, cursor);
    const lineIndex = textBefore.split("\n").length;
    setActiveLine(lineIndex);
  };

  return (
    <div className={styles.editorContainer}>
      <div className={styles.lineNumbers} aria-hidden="true">
        {lines.map((_, index) => (
          <span
            key={index}
            className={styles.lineNumber}
            data-active={index + 1 === activeLine}
          >
            {index + 1}
          </span>
        ))}
      </div>
      <div className={styles.textareaWrapper}>
        <textarea
          ref={textareaRef}
          className={styles.codeTextarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onClick={handleKeyUp}
          spellCheck={false}
          readOnly={readOnly}
          data-language={language}
          placeholder="// Type your code, interface, or solution here..."
        />
      </div>
    </div>
  );
}
