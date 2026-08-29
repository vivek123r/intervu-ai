"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { Modal } from "@/components/ui/modal";
import { CustomSelect } from "@/components/ui/select";
import { useCreateInterviewMutation } from "@/services/api/interviews.api";
import type { InterviewType } from "@/types/domain";

import styles from "@/app/(product)/product.module.css";

const INTERVIEW_TYPE_OPTIONS: Array<{ value: InterviewType; label: string }> = [
  { value: "technical", label: "Technical" },
  { value: "system_design", label: "System design" },
  { value: "behavioral", label: "Behavioral" },
  { value: "recruiter", label: "Recruiter" },
  { value: "hiring_manager", label: "Hiring manager" },
];

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
        <label className="field-label">Interview type<CustomSelect<InterviewType> value={type} options={INTERVIEW_TYPE_OPTIONS} onChange={(val) => setType(val)} /></label>
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
