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
import { Suspense, useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";
import { useProduct } from "@/lib/product-store";
import { useListResumesQuery } from "@/services/api/documents.api";
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

const difficultyLevels = [
  { id: "easy", label: "Easy", desc: "Foundational concepts" },
  { id: "normal", label: "Normal", desc: "Standard production scope" },
  { id: "hard", label: "Hard", desc: "Deep probing & edge cases" },
  { id: "brutal", label: "Brutal", desc: "Extreme stress & scaling" },
] as const;

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

  if (mode === "behavioral") {
    type = "behavioral";
    duration = 30;
    focusAreas = ["STAR Behavioral Stories", "Communication & Clarity"];
    interviewerStyle = "Hiring manager";
  } else if (mode === "system_design" || mode === "system") {
    type = "system_design";
    duration = 45;
    focusAreas = ["System design", "Distributed Systems", "Caching & Redis"];
    interviewerStyle = "Senior engineer";
  } else if (mode === "sql") {
    type = "technical";
    duration = 15;
    focusAreas = ["SQL & Data Modeling", "Concurrency & Locking"];
    interviewerStyle = "Strict technical lead";
  } else if (mode === "rapid") {
    type = "technical";
    duration = 10;
    focusAreas = ["Communication & Clarity", "System design"];
    interviewerStyle = "Neutral interviewer";
  } else if (mode === "resume") {
    type = "technical";
    duration = 20;
    focusAreas = ["STAR Behavioral Stories", "System design"];
    interviewerStyle = "Senior engineer";
  } else if (mode === "hr") {
    type = "recruiter";
    duration = 20;
    focusAreas = ["Communication & Clarity", "STAR Behavioral Stories"];
    interviewerStyle = "Friendly recruiter";
  }

  if (focusParam) {
    focusAreas = [focusParam];
  }

  const role = roleParam?.trim() || targetRole?.trim() || "Senior Backend Engineer";
  const company = companyParam?.trim() || "General Practice";

  return {
    role,
    company,
    type,
    difficulty: "hard",
    duration,
    focusAreas,
    interviewerStyle,
  };
}

export default function PracticeSetupPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.setupPage}>
          <div className={styles.chartSkeleton}>
            <span className="skeleton" />
          </div>
        </div>
      }
    >
      <PracticeSetupContent />
    </Suspense>
  );
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

  const initialConfig = useMemo(
    () => getInitialPracticeConfig(modeParam, roleParam, companyParam, focusParam, user?.targetRole),
    [modeParam, roleParam, companyParam, focusParam, user?.targetRole],
  );

  const [config, setConfig] = useState<PracticeConfig>(initialConfig);

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
    startSession(config);
    router.push("/practice/session");
  };

  const selectedPersona = interviewerPersonas.find(
    (p) => p.id === config.interviewerStyle,
  ) ?? interviewerPersonas[0];

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
              <label className="field-label">
                Interview Type
                <select
                  className="select-field"
                  value={config.type}
                  onChange={(e) => setConfig({ ...config, type: e.target.value as InterviewType })}
                >
                  <option value="technical">Technical Round</option>
                  <option value="system_design">System Design Architecture</option>
                  <option value="behavioral">Behavioral (STAR Method)</option>
                  <option value="recruiter">Recruiter Screen</option>
                  <option value="hiring_manager">Hiring Manager Round</option>
                </select>
              </label>
              <label className="field-label">
                Session Duration
                <select
                  className="select-field"
                  value={config.duration}
                  onChange={(e) => setConfig({ ...config, duration: Number(e.target.value) })}
                >
                  <option value={10}>10 minutes (Rapid)</option>
                  <option value={15}>15 minutes (Focused)</option>
                  <option value={20}>20 minutes (Standard Screen)</option>
                  <option value={30}>30 minutes (Full Deep Dive)</option>
                  <option value={45}>45 minutes (Comprehensive)</option>
                  <option value={60}>60 minutes (Onsite Simulation)</option>
                </select>
              </label>
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
              <label className="field-label" style={{ gridColumn: "1 / -1" }}>
                Active Resume Profile
                <select
                  className="select-field"
                  value={config.resumeId ?? ""}
                  onChange={(e) => setConfig({ ...config, resumeId: e.target.value || undefined })}
                >
                  <option value="">Latest Uploaded Resume (Auto-Synced)</option>
                  {resumes?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fileName} ({r.parsedSkills?.length || 0} skills indexed)
                    </option>
                  ))}
                </select>
              </label>
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
            <div className={styles.segmentedControl}>
              {difficultyLevels.map((level) => {
                const isSelected = config.difficulty === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    className={styles.segmentButton}
                    data-selected={isSelected}
                    onClick={() => setConfig({ ...config, difficulty: level.id })}
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
                  <span className={styles.counterBadge}>
                    {config.focusAreas.length}/4 selected
                  </span>
                </div>
                <small>Select up to 4 core domains for targeted evaluation.</small>
              </div>
            </div>
            <div className={styles.cleanPillRow}>
              {focusOptions.map((focus) => {
                const isSelected = config.focusAreas.includes(focus);
                return (
                  <button
                    key={focus}
                    type="button"
                    className={styles.modernPill}
                    data-selected={isSelected}
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
            <div className={styles.personaGrid}>
              {interviewerPersonas.map((persona) => {
                const isSelected = config.interviewerStyle === persona.id;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    className={styles.personaCard}
                    data-selected={isSelected}
                    onClick={() => setConfig({ ...config, interviewerStyle: persona.id })}
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

            {/* Session Timeline Roadmap */}
            <div className={styles.sessionTimeline}>
              <span className={styles.timelineTitle}>Structure Roadmap</span>
              <div className={styles.timelineSteps}>
                <div className={styles.timelineStep}>
                  <div className={styles.stepDot} />
                  <span>Introductions & Background (3m)</span>
                </div>
                <div className={styles.timelineStep}>
                  <div className={styles.stepDot} />
                  <span>Core Technical Probing ({Math.max(5, config.duration - 8)}m)</span>
                </div>
                <div className={styles.timelineStep}>
                  <div className={styles.stepDot} />
                  <span>Follow-ups & Synthesis (5m)</span>
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
                disabled={!config.role.trim() || !config.focusAreas.length}
                className={styles.enterButton}
              >
                <span>Enter Interview Room</span>
                <ArrowRight data-arrow size={16} />
              </ActionButton>
              <div className={styles.audioNotice}>
                <Mic size={13} />
                <span>Microphone access required • Realistic voice synthesis</span>
              </div>
            </div>
          </Surface>
        </aside>
      </div>
    </motion.div>
  );
}

