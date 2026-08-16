"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";

import { ActionButton } from "@/components/ui/buttons";
import { Surface } from "@/components/ui/surface";
import type { GrowthProtocol, ProtocolPriority } from "@/types/domain";

import styles from "@/app/(product)/practice/practice.module.css";

const priorityCopy: Record<ProtocolPriority, string> = {
  high: "Do first",
  medium: "Then",
  low: "Keep in mind",
};

/** The screen's answer to "what do I change next?" — ordered work, not a chart to
 * interpret. Each protocol links straight into a session focused on it. */
export function CompletionProtocols({
  protocols,
  strengths,
}: {
  protocols: GrowthProtocol[];
  strengths: string[];
}) {
  return (
    <div className={styles.protocolSection}>
      <Surface className={styles.protocolPanel}>
        <div className={styles.panelHeading}>
          <span className="fine-label">Growth protocols</span>
          <span className="mono">{protocols.length} in priority order</span>
        </div>

        <ol className={styles.protocolList}>
          {protocols.map((protocol) => (
            <li key={protocol.id} data-priority={protocol.priority}>
              <span className={styles.protocolPriority}>{priorityCopy[protocol.priority]}</span>
              <div>
                <h3>{protocol.title}</h3>
                <p>{protocol.detail}</p>
                <ActionButton
                  variant="ghost"
                  className={styles.compactAction}
                  href={`/practice/setup?focus=${encodeURIComponent(protocol.focusArea)}`}
                >
                  Practice {protocol.focusArea.toLowerCase()} <ArrowRight data-arrow size={14} />
                </ActionButton>
              </div>
            </li>
          ))}
        </ol>
      </Surface>

      <Surface className={styles.strengthPanel}>
        <div className={styles.panelHeading}>
          <span className="fine-label">What worked</span>
          <Sparkles size={16} aria-hidden="true" />
        </div>
        <ul>
          {strengths.map((strength) => (
            <li key={strength}>
              <Check size={14} aria-hidden="true" />
              <span>{strength}</span>
            </li>
          ))}
        </ul>
      </Surface>
    </div>
  );
}
