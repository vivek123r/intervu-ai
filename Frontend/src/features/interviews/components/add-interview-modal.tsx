"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { Modal } from "@/components/ui/modal";
import { CustomSelect } from "@/components/ui/select";
import { INTERVIEW_TYPE_OPTIONS_MODAL } from "@/lib/interview-options";
import { useCreateInterviewMutation } from "@/services/api/interviews.api";
import type { InterviewType } from "@/types/domain";

import styles from "@/app/(product)/product.module.css";

const formatLocalDatetime = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const getDefaultDate = (init?: string) => {
  const d = init ? new Date(init) : new Date(Date.now() + 7 * 86_400_000);
  return formatLocalDatetime(d);
};

export function AddInterviewModal({
  open,
  onClose,
  initialDate,
}: {
  open: boolean;
  onClose: () => void;
  initialDate?: string;
}) {
  const [createInterview, { isLoading }] = useCreateInterviewMutation();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [type, setType] = useState<InterviewType>("technical");
  const [date, setDate] = useState(() => getDefaultDate(initialDate));
  const [error, setError] = useState<string | null>(null);

  const [prevInitialDate, setPrevInitialDate] = useState(initialDate);
  if (initialDate !== prevInitialDate) {
    setPrevInitialDate(initialDate);
    if (initialDate) {
      setDate(formatLocalDatetime(new Date(initialDate)));
    }
  }

  const formRef = useRef<HTMLDivElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);

  // Modal itself only focuses its outer panel — send focus on to the first
  // real field once the panel has mounted.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => companyRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Traps Tab/Shift+Tab within the dialog (the panel, found via the nearest
  // .modal-panel ancestor, so this doesn't require changing the shared Modal).
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const panel = formRef.current?.closest(".modal-panel");
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !focusable.includes(active as HTMLElement)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !focusable.includes(active as HTMLElement)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const submit = async () => {
    if (!company.trim() || !role.trim()) return;

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      setError("Please choose a valid date and time.");
      return;
    }

    setError(null);
    try {
      await createInterview({
        company: company.trim(),
        role: role.trim(),
        type,
        scheduledAt: parsedDate.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }).unwrap();
      setCompany("");
      setRole("");
      onClose();
    } catch {
      setError("Couldn't add this interview. Please try again.");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add an interview">
      <div className={styles.addInterviewForm} ref={formRef}>
        <label className="field-label">Company<input ref={companyRef} className="field" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. Northstar Labs" /></label>
        <label className="field-label">Role<input className="field" value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Senior Backend Engineer" /></label>
        <label className="field-label">Date and time<input className="field" type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <div className="field-label">
          Interview type
          <CustomSelect<InterviewType>
            aria-label="Interview type"
            value={type}
            options={INTERVIEW_TYPE_OPTIONS_MODAL}
            onChange={(val) => setType(val)}
          />
        </div>
        {error && <p role="alert" style={{ color: "#ff6b6b", fontSize: "0.8rem" }}>{error}</p>}
        <div className={styles.formActions}>
          <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
          <ActionButton onClick={() => void submit()} disabled={!company.trim() || !role.trim() || isLoading}>
            {isLoading ? "Adding…" : "Add interview"} <ArrowRight data-arrow size={16} />
          </ActionButton>
        </div>
      </div>
    </Modal>
  );
}
