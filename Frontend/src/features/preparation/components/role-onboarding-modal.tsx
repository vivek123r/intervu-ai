"use client";

import {
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Check,
  Code2,
  Cpu,
  Layers,
  Sparkles,
  Users2,
} from "lucide-react";
import { useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { Modal } from "@/components/ui/modal";
import {
  saveActivePreparationTrack,
  type ActivePreparationTrack,
} from "@/lib/preparation-track";
import { useUpdateMeMutation } from "@/services/api/system.api";
import type { InterviewType, User } from "@/types/domain";

import styles from "./track-switcher.module.css";

export interface RoleOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTrack: (track: ActivePreparationTrack) => void;
  user?: User | null;
}

const ROLE_PRESETS = [
  {
    id: "backend-lead",
    role: "Senior Backend Engineer",
    company: "Platform Services & DB Internals",
    companyMark: "B",
    type: "technical" as InterviewType,
    roundName: "Distributed Systems & DB Architecture",
    icon: Cpu,
    days: 5,
    tag: "Technical",
    weakTopics: ["Distributed Caching", "Database Concurrency", "Idempotency Patterns"],
    description: "High-concurrency services, database internals, and distributed caching.",
  },
  {
    id: "systems-architect",
    role: "Distributed Systems & Cloud Architect",
    company: "Large-Scale Cloud Infrastructure",
    companyMark: "D",
    type: "system_design" as InterviewType,
    roundName: "System Design & Resiliency",
    icon: BrainCircuit,
    days: 7,
    tag: "System Design",
    weakTopics: ["Partitioning & Sharding", "Consensus (Raft/Paxos)", "Disaster Recovery"],
    description: "Multi-region availability, CAP trade-offs, and failure domain mitigation.",
  },
  {
    id: "fullstack-lead",
    role: "Full Stack Engineering Lead",
    company: "End-to-End Product Architecture",
    companyMark: "F",
    type: "technical" as InterviewType,
    roundName: "Full Stack Architecture & APIs",
    icon: Layers,
    days: 5,
    tag: "Full Stack",
    weakTopics: ["State Synchronization", "Optimistic UI", "API Schema Evolution"],
    description: "End-to-end architectures, React & Node, API contracts, and real-time state.",
  },
  {
    id: "frontend-architect",
    role: "Frontend Architect",
    company: "Web Performance & Design Systems",
    companyMark: "A",
    type: "technical" as InterviewType,
    roundName: "Browser Internals & Rendering",
    icon: Code2,
    days: 4,
    tag: "Frontend",
    weakTopics: ["Core Web Vitals", "SSR/Hydration Optimization", "State Micro-architectures"],
    description: "Design systems, web performance, browser internals, and rendering pipelines.",
  },
  {
    id: "ml-ai-engineer",
    role: "AI & Machine Learning Engineer",
    company: "LLM Infrastructure & Model Serving",
    companyMark: "M",
    type: "system_design" as InterviewType,
    roundName: "ML Systems & RAG Architecture",
    icon: Sparkles,
    days: 6,
    tag: "ML / AI",
    weakTopics: ["Vector Search Indexing", "Low-Latency Model Serving", "RAG Pipeline Resiliency"],
    description: "Model inference serving, feature pipelines, RAG systems, and scale.",
  },
  {
    id: "eng-manager",
    role: "Engineering Manager (STAR Leadership)",
    company: "Team Scaling & Engineering Culture",
    companyMark: "L",
    type: "behavioral" as InterviewType,
    roundName: "Behavioral & Conflict Resolution",
    icon: Users2,
    days: 3,
    tag: "Behavioral",
    weakTopics: ["Architectural Disagreements", "Outage Incident Leadership", "Measurable Business Impact"],
    description: "Executive communication, conflict resolution trade-offs, and STAR leadership.",
  },
];

const EXPERIENCE_OPTIONS = [
  { value: "early", label: "0–2 years (Early career)" },
  { value: "mid", label: "3–5 years (Mid-level)" },
  { value: "senior", label: "5–8 years (Senior)" },
  { value: "staff", label: "8+ years (Staff / Lead)" },
];

export function RoleOnboardingModal({
  open,
  onClose,
  onSelectTrack,
  user,
}: RoleOnboardingModalProps) {
  const [updateMe, { isLoading: isUpdating }] = useUpdateMeMutation();

  const [selectedRole, setSelectedRole] = useState(
    user?.targetRole?.trim() || "Senior Backend Engineer",
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>("backend-lead");
  const [experienceLevel, setExperienceLevel] = useState<User["experienceLevel"]>(
    user?.experienceLevel || "senior",
  );
  const [targetCompany, setTargetCompany] = useState("");

  const handleSelectPreset = (preset: (typeof ROLE_PRESETS)[0]) => {
    setSelectedPresetId(preset.id);
    setSelectedRole(preset.role);
  };

  const handleCustomRoleChange = (value: string) => {
    setSelectedRole(value);
    const matched = ROLE_PRESETS.find((p) => p.role.toLowerCase() === value.trim().toLowerCase());
    setSelectedPresetId(matched ? matched.id : null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const roleTitle = selectedRole.trim();
    if (!roleTitle) return;

    const matchedPreset = ROLE_PRESETS.find((p) => p.id === selectedPresetId);
    const companyTitle = targetCompany.trim() || matchedPreset?.company || "Target Role Calibration";

    const newTrack: ActivePreparationTrack = {
      id: matchedPreset ? matchedPreset.id : `track-${Date.now()}`,
      title: `${roleTitle} Track`,
      role: roleTitle,
      company: companyTitle,
      companyMark: (companyTitle[0] || roleTitle[0] || "T").toUpperCase(),
      type: matchedPreset ? matchedPreset.type : "technical",
      roundName: matchedPreset ? matchedPreset.roundName : "Technical Deep Dive & Architecture",
      source: "role",
      readinessScore: 75,
      currentDay: 1,
      totalDays: matchedPreset ? matchedPreset.days : 5,
      completedTasks: 0,
      totalTasks: 5,
      weakTopics: matchedPreset?.weakTopics ?? ["System Design", "Databases", "Concurrency"],
      focusDescription:
        matchedPreset?.description ??
        `Customized preparation track aligned to your ${roleTitle} target role and resume profile.`,
    };

    try {
      await updateMe({
        targetRole: roleTitle,
        experienceLevel,
        onboardingCompleted: true,
      }).unwrap();
    } catch {
      // Best-effort profile sync
    }

    saveActivePreparationTrack(newTrack);
    onSelectTrack(newTrack);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="What role are you looking to practice?"
      className={styles.roleModalPanel}
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <span className={styles.modalBadge}>
            <Sparkles size={12} /> Target Calibration
          </span>
          <p>
            Choose a preset or type your custom title. We calibrate mock question difficulty,
            architecture rubrics, and AI personas to match your goals.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.customForm}>
          {/* Quick Preset Selector Grid (3-column layout) */}
          <div className={styles.roleGrid}>
            {ROLE_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={styles.roleCard}
                  data-selected={isSelected}
                >
                  <div className={styles.roleCardTop}>
                    <span className={styles.roleCardTag}>
                      <Icon size={13} /> {preset.tag}
                    </span>
                    {isSelected && (
                      <span style={{ color: "#ffd976", display: "flex" }}>
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                  <strong className={styles.roleCardTitle}>{preset.role}</strong>
                  <p className={styles.roleCardDesc}>{preset.description}</p>
                </button>
              );
            })}
          </div>

          {/* Custom Role Input & Seniority */}
          <div className={styles.customFieldsRow}>
            <label className="field-label">
              <BriefcaseBusiness size={14} style={{ display: "inline", marginRight: "0.35rem" }} />
              Target Role Title
              <input
                className="field"
                placeholder="e.g. Senior Backend Engineer..."
                value={selectedRole}
                onChange={(e) => handleCustomRoleChange(e.target.value)}
                required
              />
            </label>

            <label className="field-label">
              Seniority Level
              <select
                className="select-field"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as User["experienceLevel"])}
              >
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-label">
              <Building2 size={14} style={{ display: "inline", marginRight: "0.35rem" }} />
              Target Company (Optional)
              <input
                className="field"
                placeholder="e.g. Stripe, FAANG, Startup"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className="quiet-button" onClick={onClose}>
              I&apos;ll explore first
            </button>
            <ActionButton
              type="submit"
              disabled={!selectedRole.trim() || isUpdating}
            >
              {isUpdating ? "Calibrating..." : "Start My Preparation Track"}
              <ArrowRight data-arrow size={16} />
            </ActionButton>
          </div>
        </form>
      </div>
    </Modal>
  );
}
