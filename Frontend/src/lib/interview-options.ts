/**
 * Canonical interview type and difficulty option lists.
 *
 * These are maintained once here to avoid duplication across the frontend.
 * The backend enum sources are Backend/app/schemas/common.py.
 * When adding a new enum value there, TypeScript errors below will signal
 * which label maps need updating.
 */

import type { InterviewType } from "@/types/domain";

// --- Interview Type Options ---

/**
 * Label maps for different contexts. Each context uses different wording
 * to match its UI/UX needs. The keys must include every InterviewType value
 * (enforced by TypeScript).
 */

const INTERVIEW_TYPE_LABELS_SETUP: Record<InterviewType, string> = {
  technical: "Technical Round",
  system_design: "System Design Architecture",
  behavioral: "Behavioral (STAR Method)",
  recruiter: "Recruiter Screen",
  hiring_manager: "Hiring Manager Round",
};

const INTERVIEW_TYPE_LABELS_MODAL: Record<InterviewType, string> = {
  technical: "Technical",
  system_design: "System design",
  behavioral: "Behavioral",
  recruiter: "Recruiter",
  hiring_manager: "Hiring manager",
};

const INTERVIEW_TYPE_LABELS_ONBOARDING: Record<InterviewType, string> = {
  technical: "Technical depth",
  system_design: "System design",
  behavioral: "Behavioral / Leadership",
  recruiter: "Recruiter screen",
  hiring_manager: "Hiring manager",
};

const INTERVIEW_TYPE_LABELS_TRACK_SWITCHER: Record<InterviewType, string> = {
  technical: "Technical Coding & Deep Dive",
  system_design: "System Architecture & Scalability",
  behavioral: "Behavioral & STAR Leadership",
  recruiter: "Recruiter",
  hiring_manager: "Hiring Manager Strategic Fit",
};

/**
 * Helper to derive an options array from a label map.
 * Enforces that all enum values have labels via TypeScript.
 */
function createInterviewTypeOptions(
  labels: Record<InterviewType, string>
): Array<{ value: InterviewType; label: string }> {
  // This ensures that every InterviewType value is addressed in the label map.
  // If a new value is added and missed, TypeScript will error on the label map.
  const allTypes: readonly InterviewType[] = [
    "technical",
    "behavioral",
    "system_design",
    "hiring_manager",
    "recruiter",
  ];

  return allTypes.map((value) => ({
    value,
    label: labels[value],
  }));
}

export const INTERVIEW_TYPE_OPTIONS_SETUP = createInterviewTypeOptions(
  INTERVIEW_TYPE_LABELS_SETUP
);

export const INTERVIEW_TYPE_OPTIONS_MODAL = createInterviewTypeOptions(
  INTERVIEW_TYPE_LABELS_MODAL
);

export const INTERVIEW_TYPE_OPTIONS_ONBOARDING = createInterviewTypeOptions(
  INTERVIEW_TYPE_LABELS_ONBOARDING
);

export const INTERVIEW_TYPE_OPTIONS_TRACK_SWITCHER = createInterviewTypeOptions(
  INTERVIEW_TYPE_LABELS_TRACK_SWITCHER
);

// --- Difficulty Options ---

type Difficulty = "easy" | "normal" | "hard" | "brutal";

interface DifficultyOption {
  id: Difficulty;
  label: string;
  desc?: string;
}

/**
 * Difficulty options for setup/practice configuration.
 * Includes descriptive text.
 */
export const DIFFICULTY_OPTIONS_SETUP: ReadonlyArray<DifficultyOption> = [
  { id: "easy", label: "Easy", desc: "Foundational concepts" },
  { id: "normal", label: "Normal", desc: "Standard production scope" },
  { id: "hard", label: "Hard", desc: "Deep probing & edge cases" },
  { id: "brutal", label: "Brutal", desc: "Extreme stress & scaling" },
];

/**
 * Difficulty options for settings (no descriptions).
 */
export const DIFFICULTY_OPTIONS_SETTINGS: Array<{
  value: Difficulty;
  label: string;
}> = [
  { value: "normal", label: "Normal" },
  { value: "hard", label: "Hard" },
  { value: "brutal", label: "Brutal" },
];

// --- Session Completion Phases ---

/**
 * Phase labels displayed during the "processing" state after an interview completes.
 * These phases correspond to the server's analysis pipeline steps.
 * Mirrors Backend/app/realtime/connection.py's session completion phases.
 */
export const SESSION_COMPLETION_PHASES = [
  "Scoring your answers",
  "Generating your performance report",
] as const;
