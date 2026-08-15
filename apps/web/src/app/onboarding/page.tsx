"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  Check,
  FileText,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { Brand } from "@/components/ui/brand";
import { ProgressBar, Surface } from "@/components/ui/surface";
import { useProduct } from "@/lib/product-store";

import styles from "../auth.module.css";

export default function OnboardingPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    state,
    connectCalendar,
    completeOnboarding,
    setResumeName,
    selectedInterview,
  } = useProduct();
  const [step, setStep] = useState(0);
  const [confirmed, setConfirmed] = useState(true);

  const finish = () => {
    completeOnboarding();
    router.push("/dashboard");
  };

  const stages = ["Calendar", "Confirm", "Profile"];

  return (
    <main className={styles.onboardingPage}>
      <header className={styles.onboardingHeader}>
        <Brand />
        <span className="mono">{step + 1} / {stages.length}</span>
      </header>
      <div className={styles.onboardingProgress}><ProgressBar value={((step + 1) / stages.length) * 100} /></div>
      <div className={styles.onboardingFrame}>
        <nav className={styles.onboardingSteps} aria-label="Onboarding progress">
          {stages.map((label, index) => (
            <div key={label} data-state={index < step ? "done" : index === step ? "current" : "future"}>
              <span>{index < step ? <Check size={15} /> : index + 1}</span>
              <p>{label}</p>
            </div>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.section
              key="calendar"
              className={styles.onboardingStage}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <div className={styles.stageCopy}>
                <span className={styles.stageIcon}><CalendarDays size={24} /></span>
                <h1>Connect your interview calendar.</h1>
                <p>
                  We’ll scan upcoming event details for likely interviews, then ask before adding anything
                  to your preparation workspace.
                </p>
              </div>
              <Surface gold className={styles.permissionPanel}>
                <div className={styles.permissionBrand}>
                  <span>G</span>
                  <div><strong>Google Calendar</strong><small>Separate from Google sign-in</small></div>
                </div>
                <ul>
                  <li><Check size={15} /> Read upcoming calendar event details</li>
                  <li><Check size={15} /> Detect likely interview events</li>
                  <li><LockKeyhole size={15} /> Never edit or delete calendar events</li>
                </ul>
                <ActionButton
                  onClick={() => {
                    connectCalendar();
                    setStep(1);
                  }}
                >
                  {state.calendarConnected ? "Calendar connected" : "Connect Google Calendar"}
                  <ArrowRight data-arrow size={16} />
                </ActionButton>
                <button className="quiet-button" onClick={() => setStep(1)}>Continue with sample events</button>
              </Surface>
            </motion.section>
          )}

          {step === 1 && (
            <motion.section
              key="confirm"
              className={styles.onboardingStage}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <div className={styles.stageCopy}>
                <span className={styles.stageIcon}><CalendarCheck size={24} /></span>
                <h1>One likely interview found.</h1>
                <p>Intervu never permanently classifies an event without your confirmation.</p>
              </div>
              <Surface
                gold={confirmed}
                className={styles.detectedEvent}
                role="button"
                tabIndex={0}
                onClick={() => setConfirmed((value) => !value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setConfirmed((value) => !value);
                }}
              >
                <div className={styles.eventConfidence}><Sparkles size={15} /> 96% likely interview</div>
                <div className={styles.eventIdentity}>
                  <span>{selectedInterview.companyMark}</span>
                  <div><strong>{selectedInterview.role}</strong><small>{selectedInterview.company}</small></div>
                </div>
                <div className={styles.eventMeta}>
                  <span className="mono">18 AUG · 10:30</span>
                  <span>{selectedInterview.round} · {selectedInterview.location}</span>
                </div>
                <label className={styles.confirmControl}>
                  <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                  <span><Check size={14} /></span>
                  Yes, prepare me
                </label>
              </Surface>
              <div className={styles.stageActions}>
                <ActionButton variant="ghost" onClick={() => setStep(0)}>Back</ActionButton>
                <ActionButton onClick={() => setStep(2)} disabled={!confirmed}>
                  Build my workspace <ArrowRight data-arrow size={16} />
                </ActionButton>
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="profile"
              className={styles.onboardingStage}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <div className={styles.stageCopy}>
                <span className={styles.stageIcon}><BriefcaseBusiness size={24} /></span>
                <h1>Give Intervu one strong source of truth.</h1>
                <p>Your resume is parsed once, stored separately, and reused across preparation plans.</p>
              </div>
              <Surface className={styles.profileSetup}>
                <label className="field-label">
                  Primary target role
                  <input className="field" defaultValue="Senior Backend Engineer" />
                </label>
                <label className="field-label">
                  Experience level
                  <select className="select-field" defaultValue="senior">
                    <option value="early">0–2 years</option>
                    <option value="mid">3–5 years</option>
                    <option value="senior">6–9 years</option>
                    <option value="staff">10+ years</option>
                  </select>
                </label>
                <input
                  ref={inputRef}
                  className="sr-only"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(event) => setResumeName(event.target.files?.[0]?.name ?? null)}
                />
                <button className={styles.resumeDrop} onClick={() => inputRef.current?.click()}>
                  <FileText size={22} />
                  <span>
                    <strong>{state.resumeName ?? "Upload your resume"}</strong>
                    <small>PDF or DOCX · up to 10 MB</small>
                  </span>
                  {state.resumeName && <Check size={17} />}
                </button>
              </Surface>
              <div className={styles.stageActions}>
                <ActionButton variant="ghost" onClick={() => setStep(1)}>Back</ActionButton>
                <ActionButton onClick={finish}>
                  Enter my workspace <ArrowRight data-arrow size={16} />
                </ActionButton>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
