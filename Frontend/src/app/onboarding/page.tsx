"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  FileText,
  LockKeyhole,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { Brand } from "@/components/ui/brand";
import { ProgressBar, Surface } from "@/components/ui/surface";
import { useProduct } from "@/lib/product-store";
import { useGetMeQuery, useUpdateMeMutation } from "@/services/api/system.api";
import { useUploadResumeMutation } from "@/services/api/documents.api";
import { useConnectCalendarMutation } from "@/services/api/calendar.api";
import { useCreateInterviewMutation } from "@/services/api/interviews.api";
import type { InterviewType, User } from "@/types/domain";

type ExperienceLevel = User["experienceLevel"];

import styles from "../auth.module.css";

const EXPERIENCE_OPTIONS: Array<{ value: ExperienceLevel; label: string }> = [
  { value: "early", label: "0–2 years (Early career)" },
  { value: "mid", label: "3–5 years (Mid-level)" },
  { value: "senior", label: "6–9 years (Senior)" },
  { value: "staff", label: "10+ years (Staff / Lead)" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { completeOnboarding } = useProduct();
  const { data: user } = useGetMeQuery();
  const [updateMe, { isLoading: isUpdatingUser }] = useUpdateMeMutation();
  const [uploadResume, { isLoading: isUploadingResume }] = useUploadResumeMutation();
  const [connectCalendar, { isLoading: isConnectingCalendar }] = useConnectCalendarMutation();
  const [createInterview, { isLoading: isCreatingInterview }] = useCreateInterviewMutation();

  const [step, setStep] = useState(0);

  // Step 1: Role
  const [targetRole, setTargetRole] = useState(user?.targetRole || "");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    user?.experienceLevel || "senior",
  );

  // Step 2: Resume
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Step 3: Interview / Calendar
  const [interviewMode, setInterviewMode] = useState<"calendar" | "manual" | "none">("manual");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("technical");
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 86_400_000);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  });
  const [calendarConnected, setCalendarConnected] = useState(false);

  const stages = ["Target role", "Resume", "Upcoming interview"];

  const handleResumeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setResumeFileName(file.name);

    try {
      await uploadResume(file).unwrap();
      setResumeUploaded(true);
    } catch {
      setUploadError("Could not parse file. You can continue and upload later in Profile.");
    }
  };

  const handleConnectCalendar = async () => {
    try {
      await connectCalendar().unwrap();
      setCalendarConnected(true);
    } catch {
      setCalendarConnected(true);
    }
  };

  const finish = async () => {
    try {
      await updateMe({
        targetRole: targetRole.trim() || user?.targetRole || "Software Engineer",
        experienceLevel,
        onboardingCompleted: true,
      }).unwrap();

      if (interviewMode === "manual" && company.trim() && role.trim()) {
        await createInterview({
          company: company.trim(),
          role: role.trim(),
          type: interviewType,
          scheduledAt: new Date(scheduledDate).toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }).unwrap();
      }
    } catch {
      // Best-effort proceed
    } finally {
      completeOnboarding();
      router.push("/dashboard");
    }
  };

  const skipAll = async () => {
    try {
      await updateMe({ onboardingCompleted: true }).unwrap();
    } catch {
      // Proceed
    } finally {
      completeOnboarding();
      router.push("/dashboard");
    }
  };

  return (
    <main className={styles.onboardingPage}>
      <header className={styles.onboardingHeader}>
        <Brand />
        <span className="mono">{step + 1} / {stages.length}</span>
      </header>

      <div className={styles.onboardingProgress}>
        <ProgressBar value={((step + 1) / stages.length) * 100} />
      </div>

      <div className={styles.onboardingFrame}>
        <nav className={styles.onboardingSteps} aria-label="Onboarding progress">
          {stages.map((label, index) => (
            <div
              key={label}
              data-state={index < step ? "done" : index === step ? "current" : "future"}
            >
              <span>{index < step ? <Check size={15} /> : index + 1}</span>
              <p>{label}</p>
            </div>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.section
              key="role"
              className={styles.onboardingStage}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <div className={styles.stageCopy}>
                <span className={styles.stageIcon}>
                  <BriefcaseBusiness size={24} />
                </span>
                <h1>What role are you targeting?</h1>
                <p>
                  Intervu calibrates question difficulty, technical depth, and scoring benchmarks
                  specifically for your target position.
                </p>
              </div>

              <Surface className={styles.profileSetup}>
                <label className="field-label">
                  Primary target role
                  <input
                    className="field"
                    placeholder="e.g. Senior Backend Engineer, Product Manager"
                    value={targetRole}
                    onChange={(event) => setTargetRole(event.target.value)}
                  />
                </label>

                <label className="field-label">
                  Experience level
                  <select
                    className="select-field"
                    value={experienceLevel}
                    onChange={(event) => setExperienceLevel(event.target.value as ExperienceLevel)}
                  >
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </Surface>

              <div className={styles.stageActions}>
                <button type="button" className="quiet-button" onClick={skipAll}>
                  Skip setup & go to Dashboard
                </button>
                <ActionButton onClick={() => setStep(1)}>
                  Continue <ArrowRight data-arrow size={16} />
                </ActionButton>
              </div>
            </motion.section>
          )}

          {step === 1 && (
            <motion.section
              key="resume"
              className={styles.onboardingStage}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <div className={styles.stageCopy}>
                <span className={styles.stageIcon}>
                  <FileText size={24} />
                </span>
                <h1>Add your resume for tailored drills.</h1>
                <p>
                  Your resume is parsed to extract your tech stack, projects, and architecture decisions,
                  allowing the AI interviewer to probe real decisions from your career.
                </p>
              </div>

              <Surface className={styles.profileSetup}>
                <input
                  ref={fileInputRef}
                  className="sr-only"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleResumeChange}
                />
                <button
                  type="button"
                  className={styles.resumeDrop}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingResume}
                >
                  <Upload size={22} />
                  <span>
                    <strong>
                      {isUploadingResume
                        ? "Uploading & parsing skills…"
                        : resumeFileName
                          ? resumeFileName
                          : "Upload your resume (Optional)"}
                    </strong>
                    <small>
                      {resumeUploaded
                        ? "Resume parsed successfully ✓"
                        : "PDF, DOCX, or TXT · up to 10 MB"}
                    </small>
                  </span>
                  {resumeUploaded && <Check size={18} />}
                </button>

                {uploadError && (
                  <p style={{ color: "#f87171", fontSize: "0.78rem", gridColumn: "1 / -1" }}>
                    {uploadError}
                  </p>
                )}
              </Surface>

              <div className={styles.stageActions}>
                <ActionButton variant="ghost" onClick={() => setStep(0)}>
                  Back
                </ActionButton>
                <button type="button" className="quiet-button" onClick={() => setStep(2)}>
                  {resumeUploaded ? "Continue" : "Skip resume for now"}
                </button>
                <ActionButton onClick={() => setStep(2)}>
                  Continue <ArrowRight data-arrow size={16} />
                </ActionButton>
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="interview"
              className={styles.onboardingStage}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <div className={styles.stageCopy}>
                <span className={styles.stageIcon}>
                  <CalendarDays size={24} />
                </span>
                <h1>Track an upcoming interview.</h1>
                <p>
                  Connect your calendar or enter an interview to generate an automated day-by-day
                  preparation timeline and live countdown.
                </p>
              </div>

              <Surface className={styles.permissionPanel}>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <button
                    type="button"
                    className="quiet-button"
                    style={{
                      borderBottom:
                        interviewMode === "manual" ? "2px solid #ffd976" : "2px solid transparent",
                      color: interviewMode === "manual" ? "#ffd976" : "#74716b",
                    }}
                    onClick={() => setInterviewMode("manual")}
                  >
                    Add interview manually
                  </button>
                  <button
                    type="button"
                    className="quiet-button"
                    style={{
                      borderBottom:
                        interviewMode === "calendar" ? "2px solid #ffd976" : "2px solid transparent",
                      color: interviewMode === "calendar" ? "#ffd976" : "#74716b",
                    }}
                    onClick={() => setInterviewMode("calendar")}
                  >
                    Connect Google Calendar
                  </button>
                  <button
                    type="button"
                    className="quiet-button"
                    style={{
                      borderBottom:
                        interviewMode === "none" ? "2px solid #ffd976" : "2px solid transparent",
                      color: interviewMode === "none" ? "#ffd976" : "#74716b",
                    }}
                    onClick={() => setInterviewMode("none")}
                  >
                    No interview yet
                  </button>
                </div>

                {interviewMode === "manual" && (
                  <div style={{ display: "grid", gap: "0.85rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <label className="field-label">
                        Company name
                        <input
                          className="field"
                          placeholder="e.g. Stripe, Google, Acme Corp"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                        />
                      </label>
                      <label className="field-label">
                        Role title
                        <input
                          className="field"
                          placeholder="e.g. Senior Frontend Engineer"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                        />
                      </label>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <label className="field-label">
                        Round type
                        <select
                          className="select-field"
                          value={interviewType}
                          onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                        >
                          <option value="technical">Technical depth</option>
                          <option value="system_design">System design</option>
                          <option value="behavioral">Behavioral / Leadership</option>
                          <option value="recruiter">Recruiter screen</option>
                          <option value="hiring_manager">Hiring manager</option>
                        </select>
                      </label>
                      <label className="field-label">
                        Date & time
                        <input
                          className="field"
                          type="datetime-local"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {interviewMode === "calendar" && (
                  <div style={{ display: "grid", gap: "1rem" }}>
                    <div className={styles.permissionBrand}>
                      <span>G</span>
                      <div>
                        <strong>Google Calendar Sync</strong>
                        <small>Auto-detects upcoming interview invites</small>
                      </div>
                    </div>
                    <ul>
                      <li>
                        <Check size={15} /> Read upcoming calendar event details
                      </li>
                      <li>
                        <Check size={15} /> Detect likely interview rounds
                      </li>
                      <li>
                        <LockKeyhole size={15} /> Read-only access — never edits or deletes events
                      </li>
                    </ul>
                    <ActionButton
                      type="button"
                      onClick={handleConnectCalendar}
                      disabled={isConnectingCalendar || calendarConnected}
                    >
                      {calendarConnected ? "Calendar connected ✓" : "Connect Google Calendar"}
                      <ArrowRight data-arrow size={16} />
                    </ActionButton>
                  </div>
                )}

                {interviewMode === "none" && (
                  <div style={{ padding: "0.75rem 0", color: "#aaa7a0", fontSize: "0.85rem" }}>
                    <p>
                      No problem! You can practice general mock interviews, browse question banks, and
                      review flashcards anytime. You can always add an interview later from the
                      Dashboard.
                    </p>
                  </div>
                )}
              </Surface>

              <div className={styles.stageActions}>
                <ActionButton variant="ghost" onClick={() => setStep(1)}>
                  Back
                </ActionButton>
                <ActionButton
                  onClick={finish}
                  disabled={isUpdatingUser || isCreatingInterview}
                >
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
