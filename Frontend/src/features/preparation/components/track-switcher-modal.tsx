"use client";

import {
  Building2,
  Check,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import {
  PRESET_ROLE_TRACKS,
  createTrackFromInterview,
  type ActivePreparationTrack,
} from "@/lib/preparation-track";
import { useGetInterviewsQuery } from "@/services/api/interviews.api";
import type { Interview, InterviewType } from "@/types/domain";

import styles from "./track-switcher.module.css";

export interface TrackSwitcherModalProps {
  open: boolean;
  onClose: () => void;
  activeTrackId: string;
  onSelectTrack: (track: ActivePreparationTrack) => void;
}

type TabType = "roles" | "interviews" | "custom";

const TAB_ITEMS = [
  { value: "roles", label: "Role Tracks" },
  { value: "interviews", label: "My Interviews" },
  { value: "custom", label: "+ Custom Track" },
] as const;

export function TrackSwitcherModal({
  open,
  onClose,
  activeTrackId,
  onSelectTrack,
}: TrackSwitcherModalProps) {
  const [tab, setTab] = useState<TabType>("roles");
  const { data: interviews } = useGetInterviewsQuery();

  // Custom Track Form State
  const [customRole, setCustomRole] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [customType, setCustomType] = useState<InterviewType>("technical");

  const handleSelectPreset = (track: ActivePreparationTrack) => {
    onSelectTrack(track);
    onClose();
  };

  const handleSelectInterview = (interview: Interview) => {
    const track = createTrackFromInterview(interview);
    onSelectTrack(track);
    onClose();
  };

  const handleCreateCustomTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRole.trim()) return;

    const roleName = customRole.trim();
    const companyName = customCompany.trim() || "Target Preparation";
    const customTrack: ActivePreparationTrack = {
      id: `track-custom-${Date.now()}`,
      title: `${companyName} · ${roleName} Track`,
      role: roleName,
      company: companyName,
      companyMark: (companyName[0] || "C").toUpperCase(),
      type: customType,
      roundName: "Custom Specialized Round",
      source: "custom",
      readinessScore: 70,
      currentDay: 1,
      totalDays: 5,
      completedTasks: 0,
      totalTasks: 5,
      weakTopics: ["Core Competency", "System Design", "Problem Solving"],
      focusDescription: `Customized preparation track designed specifically for ${roleName} at ${companyName}.`,
    };

    onSelectTrack(customTrack);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Select Active Preparation Track">
      <div className={styles.modalBody}>
        <p className={styles.modalSubtitle}>
          Choose the role, company, or specialized track you want Intervu to calibrate your daily study plan, question bank, and mock interviews to.
        </p>

        <div className={styles.tabContainer}>
          <Tabs
            items={TAB_ITEMS}
            value={tab}
            onChange={(val) => setTab(val as TabType)}
            ariaLabel="Track category filter"
          />
        </div>

        {tab === "roles" && (
          <div className={styles.trackList}>
            {PRESET_ROLE_TRACKS.map((track) => {
              const isSelected = track.id === activeTrackId;
              return (
                <div
                  key={track.id}
                  className={styles.trackCard}
                  data-selected={isSelected}
                  onClick={() => handleSelectPreset(track)}
                >
                  <div className={styles.trackCardMark}>{track.companyMark}</div>
                  <div className={styles.trackCardContent}>
                    <div className={styles.trackCardTop}>
                      <strong>{track.title}</strong>
                      <span className={styles.trackPill}>{track.type}</span>
                    </div>
                    <p>{track.focusDescription}</p>
                    <div className={styles.trackMeta}>
                      <span>{track.totalDays}-day plan</span>
                      <i>·</i>
                      <span>{track.weakTopics.slice(0, 2).join(", ")}</span>
                    </div>
                  </div>
                  <div className={styles.trackCardAction}>
                    {isSelected ? (
                      <span className={styles.selectedBadge}>
                        <Check size={14} /> Active
                      </span>
                    ) : (
                      <span className={styles.selectText}>Switch</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "interviews" && (
          <div className={styles.trackList}>
            {interviews && interviews.length > 0 ? (
              interviews.map((interview) => {
                const isSelected = activeTrackId === `track-interview-${interview.id}`;
                return (
                  <div
                    key={interview.id}
                    className={styles.trackCard}
                    data-selected={isSelected}
                    onClick={() => handleSelectInterview(interview)}
                  >
                    <div className={styles.trackCardMark}>
                      {interview.companyMark || (interview.company[0] || "I").toUpperCase()}
                    </div>
                    <div className={styles.trackCardContent}>
                      <div className={styles.trackCardTop}>
                        <strong>{interview.company}</strong>
                        <span className={styles.trackPill}>{interview.type}</span>
                      </div>
                      <p>{interview.role} · {interview.round}</p>
                      <div className={styles.trackMeta}>
                        <span>
                          {new Intl.DateTimeFormat("en", {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(interview.scheduledAt))}
                        </span>
                        <i>·</i>
                        <span>Readiness: {interview.readiness}%</span>
                      </div>
                    </div>
                    <div className={styles.trackCardAction}>
                      {isSelected ? (
                        <span className={styles.selectedBadge}>
                          <Check size={14} /> Active
                        </span>
                      ) : (
                        <span className={styles.selectText}>Target</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyTrackState}>
                <Building2 size={24} />
                <strong>No interviews added yet</strong>
                <p>Add a company or connect Google Calendar to target specific rounds.</p>
              </div>
            )}
          </div>
        )}

        {tab === "custom" && (
          <form className={styles.customForm} onSubmit={handleCreateCustomTrack}>
            <div className={styles.formGroup}>
              <label>Target Role / Title</label>
              <input
                type="text"
                placeholder="e.g. Senior Distributed Systems Engineer"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Target Company (Optional)</label>
              <input
                type="text"
                placeholder="e.g. OpenAI, Stripe, Google, or general"
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Interview Focus Style</label>
              <select
                value={customType}
                onChange={(e) => setCustomType(e.target.value as InterviewType)}
              >
                <option value="technical">Technical Coding & Deep Dive</option>
                <option value="system_design">System Architecture & Scalability</option>
                <option value="behavioral">Behavioral & STAR Leadership</option>
                <option value="hiring_manager">Hiring Manager Strategic Fit</option>
              </select>
            </div>

            <div className={styles.formActions}>
              <ActionButton type="submit" disabled={!customRole.trim()}>
                <Sparkles size={15} /> Activate Custom Track
              </ActionButton>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
