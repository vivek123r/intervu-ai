"use client";

import { ListFilter, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { Modal } from "@/components/ui/modal";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";
import { HistoryRow } from "@/features/history/components/history-row";
import {
  useDeleteHistorySessionMutation,
  useGetHistorySessionsQuery,
} from "@/services/api/history.api";
import type { HistorySession } from "@/types/domain";

import styles from "../product.module.css";

const ALL_ROLES = "all";

export default function HistoryPage() {
  const { data: sessions, isLoading } = useGetHistorySessionsQuery();
  const [deleteHistorySession, { isLoading: deleting }] = useDeleteHistorySessionMutation();
  const [role, setRole] = useState(ALL_ROLES);
  const [pendingDelete, setPendingDelete] = useState<HistorySession | null>(null);

  const roles = useMemo(
    () => [...new Set((sessions ?? []).map((session) => session.role))].sort(),
    [sessions],
  );

  const visible = useMemo(
    () => (sessions ?? []).filter((session) => role === ALL_ROLES || session.role === role),
    [role, sessions],
  );

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteHistorySession(pendingDelete.id).unwrap();
    } finally {
      setPendingDelete(null);
    }
  };

  if (isLoading) {
    return (
      <motion.div {...pageTransition} className={styles.productPage}>
        <div className={styles.chartSkeleton}><span className="skeleton" /></div>
      </motion.div>
    );
  }

  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      <header className={styles.pageHeading}>
        <div>
          <span className={styles.systemStatus}><i /> {sessions?.length ?? 0} recorded sessions</span>
          <h1>Session history</h1>
          <p>Every mock interview you have run, with the signals each one produced — reopen the analysis or clear a log you no longer need.</p>
        </div>
        <label className={styles.historyFilter}>
          <ListFilter size={15} aria-hidden="true" />
          <span className="sr-only">Filter history by role</span>
          <select className="select-field" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value={ALL_ROLES}>All roles</option>
            {roles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </header>

      <section className={styles.historyLog} aria-label="Interview history">
        {visible.map((session) => (
          <HistoryRow
            key={session.id}
            session={session}
            onDelete={setPendingDelete}
            deleting={deleting && pendingDelete?.id === session.id}
          />
        ))}

        {!visible.length && (
          <Surface className={styles.historyEmpty}>
            <span className="fine-label">No sessions yet</span>
            <h2>{sessions?.length ? "No sessions for that role." : "Your history starts with one mock."}</h2>
            <p>{sessions?.length ? "Clear the filter to see every recorded session." : "Run a practice interview and every signal from it lands here."}</p>
            {sessions?.length
              ? <ActionButton variant="ghost" onClick={() => setRole(ALL_ROLES)}>Clear filter</ActionButton>
              : <ActionButton href="/practice/setup"><Sparkles size={16} /> Start a mock interview</ActionButton>}
          </Surface>
        )}
      </section>

      <Modal open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} title="Delete this session?">
        <div className={styles.historyDeleteDialog}>
          <p>
            <strong>{pendingDelete?.role}</strong> · {pendingDelete?.company} · {pendingDelete?.code}
          </p>
          <p>This removes the log and its analysis from your history. It cannot be undone.</p>
          <div className={styles.historyDeleteActions}>
            <ActionButton variant="ghost" onClick={() => setPendingDelete(null)}>Keep it</ActionButton>
            <ActionButton onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete session"}
            </ActionButton>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
