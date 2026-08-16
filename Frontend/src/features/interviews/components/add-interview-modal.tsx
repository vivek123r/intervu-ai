"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { Modal } from "@/components/ui/modal";
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
  const [date, setDate] = useState(() => getDefaultDate(initialDate));
  const [type, setType] = useState<InterviewType>("technical");

  const [prevInitialDate, setPrevInitialDate] = useState(initialDate);
  if (initialDate !== prevInitialDate) {
    setPrevInitialDate(initialDate);
    if (initialDate) {
      setDate(formatLocalDatetime(new Date(initialDate)));
    }
  }

  const submit = async () => {
    if (!company.trim() || !role.trim()) return;
    await createInterview({
      company: company.trim(),
      role: role.trim(),
      type,
      scheduledAt: new Date(date).toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).unwrap();
    setCompany("");
    setRole("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add an interview">
      <div className={styles.addInterviewForm}>
        <label className="field-label">Company<input className="field" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. Northstar Labs" /></label>
        <label className="field-label">Role<input className="field" value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Senior Backend Engineer" /></label>
        <label className="field-label">Date and time<input className="field" type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="field-label">Interview type<select className="select-field" value={type} onChange={(event) => setType(event.target.value as InterviewType)}><option value="technical">Technical</option><option value="system_design">System design</option><option value="behavioral">Behavioral</option><option value="recruiter">Recruiter</option><option value="hiring_manager">Hiring manager</option></select></label>
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
