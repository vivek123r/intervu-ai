"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { Modal } from "@/components/ui/modal";
import type { Interview, InterviewType } from "@/lib/domain";
import { useProduct } from "@/lib/product-store";

import styles from "@/app/(product)/product.module.css";

export function AddInterviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addInterview } = useProduct();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [date, setDate] = useState(() => {
    const nextWeek = new Date(Date.now() + 7 * 86_400_000);
    return new Date(nextWeek.getTime() - nextWeek.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  const [type, setType] = useState<InterviewType>("technical");

  const submit = () => {
    if (!company.trim() || !role.trim()) return;
    const interview: Interview = {
      id: `interview-${Date.now()}`,
      company: company.trim(),
      companyMark: company.trim().slice(0, 1).toUpperCase(),
      role: role.trim(),
      type,
      round: type === "system_design" ? "System Design" : type === "behavioral" ? "Behavioral" : "Technical",
      roundNumber: 1,
      totalRounds: 3,
      scheduledAt: new Date(date).toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      durationMinutes: 60,
      status: "upcoming",
      readiness: 38,
      preparationProgress: 0,
      location: "Not added",
      accent: "#f0b94c",
      rounds: [
        { id: `round-${Date.now()}`, name: "Current round", type, status: "current" },
      ],
    };
    addInterview(interview);
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
          <ActionButton onClick={submit} disabled={!company.trim() || !role.trim()}>Add interview <ArrowRight data-arrow size={16} /></ActionButton>
        </div>
      </div>
    </Modal>
  );
}
