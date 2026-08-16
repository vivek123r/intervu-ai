"use client";

import { useState } from "react";
import {
  Boxes,
  Database,
  Layers,
  Network,
  Plus,
  Server,
  Zap,
} from "lucide-react";
import { CodeEditor } from "./code-editor";
import styles from "./scratchpad.module.css";

export interface ArchitectureCanvasProps {
  value: string;
  onChange: (content: string) => void;
}

const ARCHITECTURE_PRESETS = [
  {
    label: "+ Load Balancer",
    icon: Network,
    snippet: "    Client -->|HTTPS| ALB[AWS Application Load Balancer]\n",
  },
  {
    label: "+ Redis Cache",
    icon: Zap,
    snippet: "    Service -->|Read-Through Cache| Redis[Redis Cluster (Sub-ms Latency)]\n",
  },
  {
    label: "+ PostgreSQL Primary/Replica",
    icon: Database,
    snippet: "    Service -->|Writes| PG_Primary[(PostgreSQL Primary)]\n    PG_Primary -.->|Async Replication| PG_Replica[(PostgreSQL Read Replica)]\n",
  },
  {
    label: "+ Kafka Event Bus",
    icon: Layers,
    snippet: "    Service -->|Produce Events| Kafka[Apache Kafka / Event Stream]\n    Kafka -->|Consume Batch| Worker[Background Worker Pool]\n",
  },
  {
    label: "+ Microservice Node",
    icon: Server,
    snippet: "    Gateway -->|gRPC / Internal API| Microservice[Domain Microservice]\n",
  },
];

export function ArchitectureCanvas({ value, onChange }: ArchitectureCanvasProps) {
  const [viewMode, setViewMode] = useState<"visual" | "text">("visual");

  const appendSnippet = (snippet: string) => {
    if (!value.trim()) {
      onChange(`graph TD\n${snippet}`);
    } else {
      onChange(value + "\n" + snippet);
    }
  };

  // Parse nodes from text for visual topology preview
  const parseNodes = (text: string) => {
    const lines = text.split("\n");
    const connections: Array<{ from: string; to: string; label?: string }> = [];
    const uniqueNodes = new Set<string>();

    for (const line of lines) {
      const match = line.match(/([a-zA-Z0-9_\-\[\]\(\)]+)\s*(?:-->|-.->)\s*(?:\|([^|]+)\|)?\s*([a-zA-Z0-9_\-\[\]\(\)]+)/);
      if (match) {
        const from = match[1]?.replace(/[\[\]\(\)]/g, "").trim() || "";
        const label = match[2]?.trim();
        const to = match[3]?.replace(/[\[\]\(\)]/g, "").trim() || "";
        if (from && to) {
          uniqueNodes.add(from);
          uniqueNodes.add(to);
          connections.push({ from, to, label });
        }
      }
    }

    return { nodes: Array.from(uniqueNodes), connections };
  };

  const { nodes, connections } = parseNodes(value);

  return (
    <div className={styles.archStudioLayout}>
      <div className={styles.archToolbar}>
        <div className={styles.archPresetsList}>
          <span className={styles.presetHeading}><Boxes size={14} /> Quick Blocks:</span>
          {ARCHITECTURE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.label}
                type="button"
                className={styles.presetButton}
                onClick={() => appendSnippet(preset.snippet)}
              >
                <Icon size={13} />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.viewToggleGroup}>
          <button
            type="button"
            className={styles.viewToggleButton}
            data-active={viewMode === "visual"}
            onClick={() => setViewMode("visual")}
          >
            Visual Topology
          </button>
          <button
            type="button"
            className={styles.viewToggleButton}
            data-active={viewMode === "text"}
            onClick={() => setViewMode("text")}
          >
            Topology Spec
          </button>
        </div>
      </div>

      <div className={styles.archMainStage}>
        {viewMode === "visual" ? (
          <div className={styles.visualTopologyStage}>
            <div className={styles.topologyNodesGrid}>
              {nodes.map((node) => (
                <div key={node} className={styles.topologyCard}>
                  <div className={styles.cardGlow} />
                  <div className={styles.cardHeader}>
                    <Server size={15} />
                    <strong>{node}</strong>
                  </div>
                  <div className={styles.cardBody}>
                    <small>Active component</small>
                  </div>
                </div>
              ))}
              {nodes.length === 0 && (
                <div className={styles.emptyTopologyState}>
                  <Boxes size={28} />
                  <h3>No architecture components yet</h3>
                  <p>Click the Quick Blocks above or write topology definition to visualize your system design.</p>
                  <button
                    type="button"
                    className="gold-button"
                    onClick={() =>
                      onChange(
                        `graph TD\n    Client[Web & Mobile Clients] -->|HTTPS / WSS| ALB[Load Balancer]\n    ALB --> Gateway[API Gateway]\n    Gateway -->|Cache Layer| Redis[(Redis Cluster)]\n    Gateway -->|Primary DB| Postgres[(PostgreSQL Primary)]\n`
                      )
                    }
                  >
                    <Plus size={15} /> Load Standard Distributed Topology
                  </button>
                </div>
              )}
            </div>

            {connections.length > 0 && (
              <div className={styles.topologyConnectionsList}>
                <span className="fine-label">Connection Invariants:</span>
                <ul>
                  {connections.map((conn, idx) => (
                    <li key={idx}>
                      <code>{conn.from}</code>
                      <span className={styles.connArrow}>→ {conn.label ? `[${conn.label}]` : ""} →</span>
                      <code>{conn.to}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <CodeEditor
            value={value}
            onChange={onChange}
            language="markdown"
          />
        )}
      </div>
    </div>
  );
}
