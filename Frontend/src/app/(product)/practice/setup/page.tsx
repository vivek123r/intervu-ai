"use client";

import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Mic,
  Radio,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { pageTransition } from "@/components/ui/motion";
import { CustomSelect } from "@/components/ui/select";
import { Surface } from "@/components/ui/surface";
import {
  DIFFICULTY_OPTIONS_SETUP,
  INTERVIEW_TYPE_OPTIONS_SETUP,
} from "@/lib/interview-options";
import { useProduct } from "@/lib/product-store";
import { useListResumesQuery } from "@/services/api/documents.api";
import { useGetInterviewQuery } from "@/services/api/interviews.api";
import { useGetMeQuery } from "@/services/api/system.api";
import type { InterviewType, PracticeConfig } from "@/types/domain";

import styles from "../practice.module.css";

const focusOptions = [
  "System design",
  "SQL & Data Modeling",
  "Distributed Systems",
  "Caching & Redis",
  "Concurrency & Locking",
  "API Design & REST",
  "Node.js & Async I/O",
  "STAR Behavioral Stories",
  "Incident Management",
  "Communication & Clarity",
];

interface InterviewerPersona {
  id: string;
  name: string;
  role: string;
  tagline: string;
}

const interviewerPersonas: InterviewerPersona[] = [
  {
    id: "Senior engineer",
    name: "Senior Engineer",
    role: "Technical Peer",
    tagline: "Architecture tradeoffs, clean code & real-world scale.",
  },
  {
    id: "Strict technical lead",
    name: "Strict Tech Lead",
    role: "Deep Rigor",
    tagline: "Probes edge cases, time complexity & system bottlenecks.",
  },
  {
    id: "Hiring manager",
    name: "Hiring Manager",
    role: "Leadership & Impact",
    tagline: "Evaluates ownership, team collaboration & STAR metrics.",
  },
  {
    id: "Friendly recruiter",
    name: "Friendly Recruiter",
    role: "Culture & Screen",
    tagline: "Explores background, narrative structure & alignment.",
  },
  {
    id: "Neutral interviewer",
    name: "Neutral Evaluator",
    role: "Standard Rubric",
    tagline: "Consistent, objective probing under calibrated timing.",
  },
  {
    id: "Principal Architect",
    name: "Principal Architect",
    role: "High-Level Systems",
    tagline: "Domain-driven design, resilience & organizational scale.",
  },
];

const DURATION_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 10, label: "10 minutes (Rapid)" },
  { value: 15, label: "15 minutes (Focused)" },
  { value: 20, label: "20 minutes (Standard Screen)" },
  { value: 30, label: "30 minutes (Full Deep Dive)" },
  { value: 45, label: "45 minutes (Comprehensive)" },
  { value: 60, label: "60 minutes (Onsite Simulation)" },
];

function getInitialPracticeConfig(
  mode: string | null,
  roleParam: string | null,
  companyParam: string | null,
  focusParam: string | null,
  targetRole?: string | null,
): PracticeConfig {
  let type: InterviewType = "technical";
  let duration = 30;
  let focusAreas = ["System design", "SQL & Data Modeling"];
  let interviewerStyle = "Senior engineer";
  let difficulty: PracticeConfig["difficulty"] = "normal";

  if (mode === "behavioral") {
    type = "behavioral";
    duration = 30;
    focusAreas = ["STAR Behavioral Stories", "Communication & Clarity"];
    interviewerStyle = "Hiring manager";
    difficulty = "normal";
  } else if (mode === "system_design") {
    type = "system_design";
    duration = 45;
    focusAreas = ["System design", "Distributed Systems", "Caching & Redis"];
    interviewerStyle = "Senior engineer";
    difficulty = "hard";
  } else if (mode === "sql") {
    type = "technical";
    duration = 15;
    focusAreas = ["SQL & Data Modeling", "Concurrency & Locking"];
    interviewerStyle = "Strict technical lead";
    difficulty = "hard";
  } else if (mode === "rapid") {
    type = "technical";
    duration = 10;
    focusAreas = ["Communication & Clarity", "System design"];
    interviewerStyle = "Neutral interviewer";
    difficulty = "normal";
  } else if (mode === "resume") {
    type = "technical";
    duration = 20;
    focusAreas = ["STAR Behavioral Stories", "System design"];
    interviewerStyle = "Senior engineer";
    difficulty = "normal";
  } else if (mode === "hr") {
    type = "recruiter";
    duration = 20;
    focusAreas = ["Communication & Clarity", "STAR Behavioral Stories"];
    interviewerStyle = "Friendly recruiter";
    difficulty = "normal";
  } else if (mode === "full") {
    // The featured "Configure interview" CTA on /practice — a comprehensive,
    // mixed-competency simulation rather than a single narrow drill.
    type = "technical";
    duration = 45;
    focusAreas = ["System design", "SQL & Data Modeling", "STAR Behavioral Stories"];
    interviewerStyle = "Principal Architect";
    difficulty = "hard";
  } else if (mode === "custom") {
    // Neutral starting point — the person is about to configure everything
    // themselves, so avoid presuming a role-specific bias.
    type = "technical";
    duration = 30;
    focusAreas = [];
    interviewerStyle = "Senior engineer";
    difficulty = "normal";
  }

  if (focusParam) {
    focusAreas = [focusParam];
  }

  // No specific person's job title as a fallback — an empty value falls through
  // to the input's own placeholder / the blueprint card's neutral label instead.
  const role = roleParam?.trim() || targetRole?.trim() || "";
  const company = companyParam?.trim() || "General Practice";

  return {
    role,
    company,
    type,
    difficulty,
    duration,
    focusAreas,
    interviewerStyle,
  };
}

/** Snaps an arbitrary interview duration onto the nearest option this screen
 * actually offers, clamped to the backend's accepted 5..120 range. */
function nearestDurationOption(minutes: number): number {
  const clamped = Math.min(120, Math.max(5, minutes));
  return DURATION_OPTIONS.reduce((closest, option) =>
    Math.abs(option.value - clamped) < Math.abs(closest - clamped) ? option.value : closest,
  DURATION_OPTIONS[0]!.value);
}

export default function PracticeSetupPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.setupPage}>
          <div className={styles.chartSkeleton} role="status" aria-busy="true" aria-label="Loading session setup">
            <span className="skeleton" aria-hidden="true" />
          </div>
        </div>
      }
    >
      <PracticeSetupContent />
    </Suspense>
  );
}

/** Arrow-key roving-tabindex for a `role="radiogroup"` — moving focus also
 * changes the selection, matching how native radio buttons behave. */
function handleRadioGroupKeyDown<Item>(
  event: KeyboardEvent<HTMLButtonElement>,
  items: readonly Item[],
  currentId: string,
  getId: (item: Item) => string,
  onSelect: (item: Item) => void,
  refs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>,
) {
  const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
  const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";
  if (!forward && !backward) return;
  event.preventDefault();
  const currentIndex = items.findIndex((item) => getId(item) === currentId);
  const delta = forward ? 1 : -1;
  const nextItem = items[(currentIndex + delta + items.length) % items.length];
  if (!nextItem) return;
  onSelect(nextItem);
  refs.current[getId(nextItem)]?.focus();
}

function PracticeSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startSession } = useProduct();
  const { data: user } = useGetMeQuery();
  const { data: resumes } = useListResumesQuery();

  const modeParam = searchParams.get("mode");
  const roleParam = searchParams.get("role");
  const companyParam = searchParams.get("company");
  const focusParam = searchParams.get("focus");
  const interviewIdParam = searchParams.get("interview");

  const { data: interviewData, isError: interviewLoadError } = useGetInterviewQuery(
    interviewIdParam || "",
    { skip: !interviewIdParam },
  );

  const initialConfig = useMemo(
    () => getInitialPracticeConfig(modeParam, roleParam, companyParam, focusParam, user?.targetRole),
    [modeParam, roleParam, companyParam, focusParam, user?.targetRole],
  );

  const [config, setConfig] = useState<PracticeConfig>(initialConfig);

  // Seed role/company/type from the selected interview (or the user's target
  // role) once it resolves. `initialConfig` above is only a same-render guess —
  // `useGetInterviewQuery` and `useGetMeQuery` are still loading on first paint,
  // and `useState`'s initializer never re-runs once they land. Only fills in
  // fields the person hasn't already typed over, so it can't fight a live edit.
  useEffect(() => {
    if (!interviewData && !user?.targetRole) return;
    const timer = window.setTimeout(() => {
      setConfig((current) => ({
        ...current,
        role: current.role || interviewData?.role || user?.targetRole?.trim() || "",
        company:
          interviewData && current.company === "General Practice"
            ? interviewData.company
            : current.company,
        type: (interviewData?.type as PracticeConfig["type"]) || current.type,
        duration: interviewData?.durationMinutes
          ? nearestDurationOption(interviewData.durationMinutes)
          : current.duration,
      }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [interviewData, user?.targetRole]);

  const toggleFocus = (focus: string) => {
    setConfig((current) => {
      const exists = current.focusAreas.includes(focus);
      if (exists) {
        return {
          ...current,
          focusAreas: current.focusAreas.filter((item) => item !== focus),
        };
      }
      if (current.focusAreas.length >= 4) {
        return current; // Cap at 4
      }
      return {
        ...current,
        focusAreas: [...current.focusAreas, focus],
      };
    });
  };

  const begin = () => {
    startSession({ ...config, interviewId: interviewIdParam ?? undefined });
    router.push(
      interviewIdParam ? `/practice/session?interview=${interviewIdParam}` : "/practice/session",
    );
  };

  const selectedPersona = interviewerPersonas.find(
    (p) => p.id === config.interviewerStyle,
  ) ?? interviewerPersonas[0];

  // Mic status the person can actually see before they hit "Enter Interview
  // Room" — the room itself only asked for permission after a backend session
  // and questions had already been generated, which is too late to matter.
  const [micStatus, setMicStatus] = useState<"unknown" | "checking" | "granted" | "denied" | "prompt">(
    "unknown",
  );

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setMicStatus("checking");
      void (async () => {
        try {
          if (navigator.permissions?.query) {
            const status = await navigator.permissions.query({
              name: "microphone" as PermissionName,
            });
            if (cancelled) return;
            setMicStatus(status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "prompt");
            status.onchange = () => {
              setMicStatus(status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "prompt");
            };
            return;
          }
        } catch {
          // Permissions API unsupported/unqueryable for "microphone" in this browser — fall through to the probe.
        }
        if (cancelled) return;
        setMicStatus("prompt");
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const requestMicAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicStatus("granted");
    } catch {
      setMicStatus("denied");
    }
  };

  const missingRole = !config.role.trim();
  const missingFocus = !config.focusAreas.length;
  const enterRoomReason =
    missingRole && missingFocus
      ? "Enter a role title and select at least one target competency before entering the room."
      : missingRole
        ? "Enter a role title before entering the room."
        : missingFocus
          ? "Select at least one target competency before entering the room."
          : "";
  const isAtFocusCap = config.focusAreas.length >= 4;

  const difficultyRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const personaRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  return (
    <motion.div {...pageTransition} className={styles.setupPage}>
      <button className={styles.practiceBack} onClick={() => router.back()}>
        <ArrowLeft size={15} /> Practice Hub
      </button>

      <header className={styles.setupHeading}>
        <div className={styles.badgeRow}>
          <span className="fine-label">Session Calibration</span>
          <span className={styles.liveIndicator}>
            <Radio size={12} className={styles.pulseIcon} /> Audio Engine Ready
          </span>
        </div>
        <h1>Configure Your Simulation</h1>
        <p>Calibrate role depth, interviewer rigor, and target competencies before stepping into the room.</p>
        {interviewLoadError && (
          <p className={styles.audioNotice} role="alert">
            Couldn&apos;t load that interview — continuing as General Practice instead.
          </p>
        )}
      </header>

      <div className={styles.setupGrid}>
        <Surface className={styles.setupForm}>
          {/* 1. Context */}
          <div className={styles.setupSection}>
            <div className={styles.sectionHeader}>
              <SlidersHorizontal size={18} />
              <div>
                <strong>Role & Target Company</strong>
                <small>Defines the scenario context and technical benchmarks.</small>
              </div>
            </div>
            <div className={styles.formGrid}>
              <label className="field-label">
                Role Title
                <input
                  className="field"
                  value={config.role}
                  placeholder="e.g. Staff Backend Engineer"
                  onChange={(e) => setConfig({ ...config, role: e.target.value })}
                  required
                  aria-invalid={missingRole}
                  aria-describedby={missingRole ? "enter-room-hint" : undefined}
                />
              </label>
              <label className="field-label">
                Target Company
                <input
                  className="field"
                  value={config.company}
                  placeholder="e.g. Stripe, Google, General Practice"
                  onChange={(e) => setConfig({ ...config, company: e.target.value })}
                />
              </label>
              <div className="field-label">
                Interview Type
                <CustomSelect<InterviewType>
                  aria-label="Interview Type"
                  value={config.type}
                  options={INTERVIEW_TYPE_OPTIONS_SETUP}
                  onChange={(val) => setConfig({ ...config, type: val })}
                />
              </div>
              <div className="field-label">
                Session Duration
                <CustomSelect<number>
                  aria-label="Session Duration"
                  value={config.duration}
                  options={DURATION_OPTIONS}
                  onChange={(val) => setConfig({ ...config, duration: val })}
                />
              </div>
            </div>
          </div>

          {/* 2. Resume */}
          <div className={styles.setupSection}>
            <div className={styles.sectionHeader}>
              <FileText size={18} />
              <div>
                <strong>Resume Integration</strong>
                <small>AI extracts your real career achievements into scenario questions.</small>
              </div>
            </div>
            <div className={styles.formGrid}>
              <div className="field-label" style={{ gridColumn: "1 / -1" }}>
                Active Resume Profile
                <CustomSelect<string>
                  aria-label="Active Resume Profile"
                  value={config.resumeId ?? ""}
                  options={[
                    { value: "", label: "Latest Uploaded Resume (Auto-Synced)" },
                    ...(resumes?.map((r) => ({
                      value: r.id,
                      label: `${r.fileName} (${r.parsedSkills?.length || 0} skills indexed)`,
                    })) || []),
                  ]}
                  onChange={(val) => setConfig({ ...config, resumeId: val || undefined })}
                />
              </div>
            </div>
          </div>

          {/* 3. Difficulty - Clean Segmented Control (Zero Ticks) */}
          <div className={styles.setupSection}>
            <div className={styles.sectionHeader}>
              <Sparkles size={18} />
              <div>
                <strong>Evaluation Rigor</strong>
                <small>Controls follow-up intensity, edge-case probing, and grading standard.</small>
              </div>
            </div>
            <div className={styles.segmentedControl} role="radiogroup" aria-label="Evaluation rigor">
              {DIFFICULTY_OPTIONS_SETUP.map((level) => {
                const isSelected = config.difficulty === level.id;
                return (
                  <button
                    key={level.id}
                    ref={(el) => {
                      difficultyRefs.current[level.id] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    className={styles.segmentButton}
                    data-selected={isSelected}
                    onClick={() => setConfig({ ...config, difficulty: level.id })}
                    onKeyDown={(e) =>
                      handleRadioGroupKeyDown(
                        e,
                        DIFFICULTY_OPTIONS_SETUP,
                        level.id,
                        (item) => item.id,
                        (item) => setConfig({ ...config, difficulty: item.id }),
                        difficultyRefs,
                      )
                    }
                  >
                    <span className={styles.segmentTitle}>{level.label}</span>
                    <span className={styles.segmentDesc}>{level.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Focus Areas - Pure Pill Glow, Zero Ticks, No Layout Shifts */}
          <div className={styles.setupSection}>
            <div className={styles.sectionHeader}>
              <Target size={18} />
              <div>
                <div className={styles.headerWithBadge}>
                  <strong>Target Competencies</strong>
                  <span className={styles.counterBadge} aria-live="polite">
                    {config.focusAreas.length}/4 selected
                  </span>
                </div>
                <small>Select up to 4 core domains for targeted evaluation.</small>
              </div>
            </div>
            <div className={styles.cleanPillRow} role="group" aria-label="Target competencies (select up to 4)">
              {focusOptions.map((focus) => {
                const isSelected = config.focusAreas.includes(focus);
                const isDisabled = !isSelected && isAtFocusCap;
                return (
                  <button
                    key={focus}
                    type="button"
                    className={styles.modernPill}
                    data-selected={isSelected}
                    aria-pressed={isSelected}
                    aria-disabled={isDisabled}
                    onClick={() => toggleFocus(focus)}
                  >
                    {focus}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Interviewer Style - Balanced 6-Card Grid (Zero Ticks, No Holes) */}
          <div className={styles.setupSection}>
            <div className={styles.sectionHeader}>
              <UserRound size={18} />
              <div>
                <strong>Interviewer Demeanor</strong>
                <small>Select the persona and evaluation style of your AI interviewer.</small>
              </div>
            </div>
            <div className={styles.personaGrid} role="radiogroup" aria-label="Interviewer demeanor">
              {interviewerPersonas.map((persona) => {
                const isSelected = config.interviewerStyle === persona.id;
                return (
                  <button
                    key={persona.id}
                    ref={(el) => {
                      personaRefs.current[persona.id] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    className={styles.personaCard}
                    data-selected={isSelected}
                    onClick={() => setConfig({ ...config, interviewerStyle: persona.id })}
                    onKeyDown={(e) =>
                      handleRadioGroupKeyDown(
                        e,
                        interviewerPersonas,
                        persona.id,
                        (item) => item.id,
                        (item) => setConfig({ ...config, interviewerStyle: item.id }),
                        personaRefs,
                      )
                    }
                  >
                    <div className={styles.personaCardHeader}>
                      <span className={styles.personaName}>{persona.name}</span>
                      <span className={styles.personaRoleBadge}>{persona.role}</span>
                    </div>
                    <p className={styles.personaTagline}>{persona.tagline}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </Surface>

        {/* Right Sticky Summary: Structured Session Blueprint */}
        <aside className={styles.setupSummary}>
          <Surface gold className={styles.blueprintCard}>
            <div className={styles.blueprintHeader}>
              <span className="fine-label">Session Blueprint</span>
              <h2>{config.role || "Software Engineer"}</h2>
              <span className={styles.companyBadge}>{config.company || "General Practice"}</span>
            </div>

            <div className={styles.specList}>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Mode</span>
                <span className={styles.specValue}>{config.type.replace("_", " ")}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Difficulty</span>
                <span className={styles.specValue} style={{ textTransform: "capitalize" }}>
                  {config.difficulty}
                </span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Duration</span>
                <span className={styles.specValue}>{config.duration} Minutes</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Interviewer</span>
                <span className={styles.specValue}>{selectedPersona?.name ?? config.interviewerStyle}</span>
              </div>
            </div>

            {/* Session Timeline Roadmap — question count mirrors the server's
                actual planning (duration // 6, see Backend's session start),
                rather than an invented minute-by-minute breakdown. */}
            <div className={styles.sessionTimeline}>
              <span className={styles.timelineTitle}>Structure Roadmap</span>
              <div className={styles.timelineSteps}>
                <div className={styles.timelineStep}>
                  <div className={styles.stepDot} />
                  <span>Interviewer introduction</span>
                </div>
                <div className={styles.timelineStep}>
                  <div className={styles.stepDot} />
                  <span>
                    ~{Math.max(3, Math.round(config.duration / 6))} planned questions
                  </span>
                </div>
                <div className={styles.timelineStep}>
                  <div className={styles.stepDot} />
                  <span>Wrap-up & synthesis</span>
                </div>
              </div>
            </div>

            {/* Selected Focus Badges */}
            {config.focusAreas.length > 0 && (
              <div className={styles.activeCompetencies}>
                <span className={styles.timelineTitle}>Target Domains</span>
                <div className={styles.competencyBadges}>
                  {config.focusAreas.map((f) => (
                    <span key={f} className={styles.competencyTag}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.actionBlock}>
              <ActionButton
                onClick={begin}
                disabled={missingRole || missingFocus}
                aria-describedby={enterRoomReason ? "enter-room-hint" : undefined}
                className={styles.enterButton}
              >
                <span>Enter Interview Room</span>
                <ArrowRight data-arrow size={16} />
              </ActionButton>
              <span id="enter-room-hint" className="sr-only" aria-live="polite">
                {enterRoomReason}
              </span>
              {micStatus === "granted" ? (
                <div className={styles.audioNotice}>
                  <Mic size={13} />
                  <span>Microphone ready • Realistic voice synthesis</span>
                </div>
              ) : micStatus === "denied" ? (
                <button
                  type="button"
                  className={styles.audioNotice}
                  style={{ background: "none", border: "none", width: "100%", cursor: "pointer" }}
                  onClick={() => void requestMicAccess()}
                >
                  <Mic size={13} />
                  <span>Microphone blocked — enable it in your browser settings</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.audioNotice}
                  style={{ background: "none", border: "none", width: "100%", cursor: "pointer" }}
                  onClick={() => void requestMicAccess()}
                >
                  <Mic size={13} />
                  <span>Microphone access required • Tap to grant now</span>
                </button>
              )}
            </div>
          </Surface>
        </aside>
      </div>
    </motion.div>
  );
}

