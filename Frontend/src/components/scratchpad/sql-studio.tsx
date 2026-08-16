"use client";

import { useState } from "react";
import { Database, Play, TableProperties } from "lucide-react";
import { CodeEditor } from "./code-editor";
import { runSqlQuery, type SqlQueryResult, MOCK_DATABASE_SCHEMA } from "@/lib/scratchpad/runner";
import styles from "./scratchpad.module.css";

export interface SqlStudioProps {
  value: string;
  onChange: (query: string) => void;
}

export function SqlStudio({ value, onChange }: SqlStudioProps) {
  const [result, setResult] = useState<SqlQueryResult | null>(() => runSqlQuery(value));
  const [selectedTable, setSelectedTable] = useState<string>("users");

  const execute = () => {
    const res = runSqlQuery(value);
    setResult(res);
  };

  const schemaTables = Object.keys(MOCK_DATABASE_SCHEMA);

  return (
    <div className={styles.sqlStudioLayout}>
      <div className={styles.sqlEditorSection}>
        <div className={styles.sqlToolbar}>
          <div className={styles.schemaBadge}>
            <Database size={14} />
            <span>Mock PostgreSQL / Relational DB</span>
          </div>
          <button className={styles.runButton} onClick={execute} title="Execute Query (⌘ + Enter)">
            <Play size={14} />
            <span>Run Query</span>
          </button>
        </div>

        <CodeEditor
          value={value}
          onChange={onChange}
          language="sql"
          onRun={execute}
        />
      </div>

      <div className={styles.sqlResultsSection}>
        <div className={styles.schemaExplorerHeader}>
          <div className={styles.schemaTabs}>
            <span className={styles.schemaTitle}><TableProperties size={13} /> Tables:</span>
            {schemaTables.map((tbl) => (
              <button
                key={tbl}
                className={styles.schemaTabButton}
                data-active={selectedTable === tbl}
                onClick={() => {
                  setSelectedTable(tbl);
                  onChange(`SELECT * FROM ${tbl} LIMIT 10;`);
                }}
              >
                {tbl}
              </button>
            ))}
          </div>

          {result && result.success && (
            <div className={styles.queryMeta}>
              <span>{result.rowCount} row{result.rowCount === 1 ? "" : "s"}</span>
              <span className="mono">({result.executionTimeMs}ms)</span>
            </div>
          )}
        </div>

        {result?.error ? (
          <div className={styles.sqlError}>
            <p><strong>Query Error:</strong> {result.error}</p>
          </div>
        ) : result && result.rows.length > 0 ? (
          <div className={styles.tableScroll}>
            <table className={styles.resultTable}>
              <thead>
                <tr>
                  {result.columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {result.columns.map((col) => (
                      <td key={col}>{String(row[col] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyTableState}>
            <span>No rows returned. Run a SELECT query to see formatted records.</span>
          </div>
        )}
      </div>
    </div>
  );
}
