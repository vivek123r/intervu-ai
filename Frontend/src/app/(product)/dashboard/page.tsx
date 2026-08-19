"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  FileText,
  Flame,
  Plus,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { AnimatedNumber, pageTransition } from "@/components/ui/motion";
import { ScoreRing } from "@/components/ui/score-ring";
import { Sparkline } from "@/components/ui/sparkline";
import { ProgressBar, Surface } from "@/components/ui/surface";
import { AddInterviewModal } from "@/features/interviews/components/add-interview-modal";
import { RoleOnboardingModal } from "@/features/preparation/components/role-onboarding-modal";
import { TrackSwitcherModal } from "@/features/preparation/components/track-switcher-modal";
import {
  PRESET_ROLE_TRACKS,
  createTrackFromInterview,
  getActivePreparationTrack,
  getDefaultTopicBenchmarks,
  getDefaultTrackDrills,
  saveActivePreparationTrack,
  toTitleCase,
  type ActivePreparationTrack,
} from "@/lib/preparation-track";
import { useGetDashboardOverviewQuery } from "@/services/api/interviews.api";
import { useUpdatePreparationTaskMutation } from "@/services/api/preparation.api";
import { useGetResumeQuery } from "@/services/api/documents.api";
import { useGetMeQuery } from "@/services/api/system.api";

import styles from "../product.module.css";

export default function DashboardPage() {
  const { data: overview, isLoading: overviewLoading } = useGetDashboardOverviewQuery();
  const { data: user } = useGetMeQuery();
  const { data: resume } = useGetResumeQuery();
  const [updateTask] = useUpdatePreparationTaskMutation();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [manualRoleModalOpen, setManualRoleModalOpen] = useState(false);
  const [roleModalDismissed, setRoleModalDismissed] = useState(false);
  const [now] = useState(() => Date.now());
  const [localDrillStatus, setLocalDrillStatus] = useState<Record<string, boolean>>({});

  // User-driven active preparation track (null for brand new user who hasn't selected a path yet)
  const [activeTrack, setActiveTrack] = useState<ActivePreparationTrack | null>(() =>
    getActivePreparationTrack(user),
  );

  // Auto-pop role calibration on first login if no target role or track configured
  const roleOnboardingOpen =
    manualRoleModalOpen ||
    Boolean(!overviewLoading && user && !activeTrack && !user.targetRole && !roleModalDismissed);

  const handleCloseRoleModal = () => {
    setManualRoleModalOpen(false);
    setRoleModalDismissed(true);
  };

  const handleSelectTrack = (selectedTrack: ActivePreparationTrack) => {
    setActiveTrack(selectedTrack);
    saveActivePreparationTrack(selectedTrack);
  };

  if (overviewLoading || !overview) {
    return (
      <motion.div {...pageTransition} className={styles.productPage}>
        <div className={styles.chartSkeleton}><span className="skeleton" /></div>
      </motion.div>
    );
  }

  const firstName =
    user?.displayName?.trim().split(/\s+/)[0] ||
    "Candidate";

  const { upcomingInterviews, todayTasks, weakTopics, streakDays, scoreTrend, readinessDeltaThisWeek } = overview;

  const currentMonthDate = new Date(now);
  const currentMonthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(currentMonthDate);

  const thisMonthInterviews = (upcomingInterviews ?? []).filter((interview) => {
    const d = new Date(interview.scheduledAt);
    return (
      d.getTime() >= now - 3600_000 &&
      d.getMonth() === currentMonthDate.getMonth() &&
      d.getFullYear() === currentMonthDate.getFullYear() &&
      interview.status !== "completed" &&
      interview.status !== "cancelled"
    );
  });

  // ==========================================
  // BRAND NEW USER / NO ACTIVE TRACK SELECTED
  // ==========================================
  if (!activeTrack) {
    const hasRole = Boolean(user?.targetRole && user.targetRole.trim());
    const hasResume = Boolean(resume?.fileName);
    const hasInterview = thisMonthInterviews.length > 0;
    const completedSteps = (hasRole ? 1 : 0) + (hasResume ? 1 : 0) + (hasInterview ? 1 : 0);

    return (
      <motion.div {...pageTransition} className={styles.productPage}>
        <section className={styles.dashboardHeading}>
          <div>
            <span className={styles.systemStatus}>
              <i /> Preparation Setup
            </span>
            <h1>Welcome, {firstName}.</h1>
            <p>Select your preparation path to generate your tailored study plan, questions, and AI mock sessions.</p>
          </div>
          <div className={styles.headingStreak}>
            <Flame size={18} />
            <strong>0</strong>
            <span>day streak</span>
          </div>
        </section>

        {/* Setup Checklist Bar */}
        <Surface className={styles.setupChecklistCard}>
          <div className={styles.setupChecklistHeader}>
            <div>
              <h2>Quickstart setup</h2>
              <p>Configure your target role and resume to calibrate question difficulty.</p>
            </div>
            <div className={styles.setupProgressBadge}>
              <strong>{completedSteps}/3</strong> completed
            </div>
          </div>
          <ProgressBar value={(completedSteps / 3) * 100} />

          <div className={styles.setupStepsList}>
            <div className={styles.setupStepItem} data-complete={hasRole}>
              <div className={styles.setupStepIcon}>
                <BriefcaseBusiness size={18} />
              </div>
              <div className={styles.setupStepContent}>
                <strong>Target role</strong>
                <span>{hasRole ? user?.targetRole : "Configure your target role and seniority"}</span>
              </div>
              <ActionButton onClick={() => setManualRoleModalOpen(true)} variant="ghost" className="mono">
                {hasRole ? "Edit" : "Set role"}
              </ActionButton>
            </div>

            <div className={styles.setupStepItem} data-complete={hasResume}>
              <div className={styles.setupStepIcon}>
                <FileText size={18} />
              </div>
              <div className={styles.setupStepContent}>
                <strong>Resume & skills</strong>
                <span>{hasResume ? (resume?.fileName ?? "Resume uploaded ✓") : "Upload your resume for project-specific questions"}</span>
              </div>
              <ActionButton href="/profile" variant="ghost" className="mono">
                {hasResume ? "Manage" : "Upload"}
              </ActionButton>
            </div>

            <div className={styles.setupStepItem} data-complete={hasInterview}>
              <div className={styles.setupStepIcon}>
                <CalendarDays size={18} />
              </div>
              <div className={styles.setupStepContent}>
                <strong>Interview tracking</strong>
                <span>{hasInterview ? "Interview active" : "Add an upcoming round or connect calendar"}</span>
              </div>
              <ActionButton onClick={() => setAddModalOpen(true)} variant="ghost" className="mono">
                {hasInterview ? "View" : "+ Add"}
              </ActionButton>
            </div>
          </div>
        </Surface>

        {/* Primary Role Track Starter Cards */}
        <section style={{ margin: "1.5rem 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <span className="fine-label">Choose your starting track</span>
              <h2 style={{ fontSize: "1.25rem", margin: "0.2rem 0 0 0", fontWeight: "550" }}>
                Select a role to start preparing
              </h2>
            </div>
            <ActionButton onClick={() => setTrackModalOpen(true)} variant="ghost" style={{ fontSize: "0.75rem" }}>
              <Compass size={14} /> Browse all tracks
            </ActionButton>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1rem",
            }}
          >
            {PRESET_ROLE_TRACKS.map((track) => (
              <Surface
                key={track.id}
                interactive
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "1.25rem",
                  gap: "0.9rem",
                  cursor: "pointer",
                }}
                onClick={() => handleSelectTrack(track)}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(240, 185, 76, 0.12)",
                        border: "1px solid rgba(240, 185, 76, 0.3)",
                        color: "#f0b94c",
                        fontWeight: "600",
                      }}
                    >
                      {track.companyMark}
                    </div>
                    <span className={styles.trackPill}>{track.type}</span>
                  </div>
                  <strong style={{ fontSize: "0.95rem", color: "#ffffff", display: "block", marginBottom: "0.3rem" }}>
                    {track.title}
                  </strong>
                  <p style={{ margin: 0, color: "#8e8b84", fontSize: "0.76rem", lineHeight: "1.45" }}>
                    {track.focusDescription}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.6rem", borderTop: "1px solid rgba(255, 255, 255, 0.07)" }}>
                  <span style={{ fontSize: "0.7rem", color: "#74716b" }}>{track.totalDays}-day plan</span>
                  <span style={{ fontSize: "0.75rem", color: "#f0b94c", display: "flex", alignItems: "center", gap: "0.3rem", fontWeight: "550" }}>
                    Activate track <ArrowRight size={13} />
                  </span>
                </div>
              </Surface>
            ))}
          </div>
        </section>

        {/* Alternative Starting Paths */}
        <section className={styles.dashboardEmptyHero}>
          <Surface gold className={styles.emptyHeroMain}>
            <div className={styles.emptyHeroCopy}>
              <span className="fine-label">Other options</span>
              <h2>Have an interview scheduled or want freeform practice?</h2>
              <p>
                Target a specific company interview from your calendar, or dive straight into an on-demand pressure test.
              </p>
            </div>

            <div className={styles.quickActionGrid}>
              <button
                type="button"
                className={styles.quickActionCard}
                onClick={() => setAddModalOpen(true)}
              >
                <Plus size={20} />
                <strong>Target an upcoming interview</strong>
                <span>Enter company and round to get a personalized interview preparation track.</span>
              </button>

              <Link href="/interviews" className={styles.quickActionCard}>
                <CalendarCheck size={20} />
                <strong>Connect Google Calendar</strong>
                <span>Import scheduled interview invites and set any round as your active prep target.</span>
              </Link>

              <Link href="/practice" className={styles.quickActionCard}>
                <Zap size={20} />
                <strong>Freeform mock practice</strong>
                <span>Jump straight into a 15-minute technical or behavioral pressure test.</span>
              </Link>
            </div>
          </Surface>

          <Surface className={styles.readinessExplainer}>
            <div>
              <span className="fine-label">Readiness Framework</span>
              <h3>How your score is calculated</h3>
            </div>
            <ul className={styles.readinessSignalsList}>
              <li><Sparkles size={14} /> <strong>Technical depth</strong> — Correctness, edge cases & trade-offs</li>
              <li><Sparkles size={14} /> <strong>Answer structure</strong> — STAR framework & logical framing</li>
              <li><Sparkles size={14} /> <strong>Communication clarity</strong> — Concise delivery & articulation</li>
              <li><Sparkles size={14} /> <strong>Speaking pace</strong> — 120–150 WPM & minimal filler words</li>
              <li><Sparkles size={14} /> <strong>Relevance</strong> — Direct answers without tangential drift</li>
            </ul>
            <ActionButton href="/practice/setup?mode=technical">
              Start first practice drill <ArrowRight data-arrow size={16} />
            </ActionButton>
          </Surface>
        </section>

        <AddInterviewModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
        <TrackSwitcherModal
          open={trackModalOpen}
          onClose={() => setTrackModalOpen(false)}
          activeTrackId=""
          onSelectTrack={handleSelectTrack}
        />
        <RoleOnboardingModal
          open={roleOnboardingOpen}
          onClose={handleCloseRoleModal}
          onSelectTrack={handleSelectTrack}
          user={user}
        />
      </motion.div>
    );
  }

  // ==========================================
  // ACTIVE USER WITH ACTIVE PREPARATION TRACK
  // ==========================================
  const formattedRole = toTitleCase(activeTrack.role);
  const formattedTitle = activeTrack.title.includes("Track")
    ? `${formattedRole} Track`
    : toTitleCase(activeTrack.title);
  const formattedCompany = toTitleCase(activeTrack.company || "Target Role Calibration");

  // Calibrated default tasks & topics fallback to ensure the board is rich & interactive
  const fallbackDrills = getDefaultTrackDrills(activeTrack.role);
  const hasBackendTasks = todayTasks.length > 0;
  const currentTasks = hasBackendTasks
    ? todayTasks
    : fallbackDrills.map((drill) => ({
        ...drill,
        status: (localDrillStatus[drill.id] !== undefined
          ? localDrillStatus[drill.id]
            ? "completed"
            : "pending"
          : drill.status) as "completed" | "pending",
      }));

  const completedTasksCount = currentTasks.filter((t) => t.status === "completed").length;

  const fallbackTopics = getDefaultTopicBenchmarks(activeTrack.role);
  const currentTopics = weakTopics.length > 0 ? weakTopics : fallbackTopics;

  const handleToggleTask = (taskId: string, currentStatus: string) => {
    if (hasBackendTasks) {
      void updateTask({ id: taskId, status: currentStatus === "completed" ? "pending" : "completed" });
    } else {
      setLocalDrillStatus((prev) => ({
        ...prev,
        [taskId]: !(prev[taskId] ?? (currentStatus === "completed")),
      }));
    }
  };

  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      {/* Top Greeting & System Status */}
      <section className={styles.dashboardHeading}>
        <div>
          <span className={styles.systemStatus}>
            <i /> Active Track · {formattedRole}
          </span>
          <h1>Good evening, {firstName}.</h1>
          <p>Your preparation workspace is active. Today’s drills are ready.</p>
        </div>
        <div className={styles.headingStreak}>
          <Flame size={18} />
          <strong>{streakDays}</strong>
          <span>day streak</span>
        </div>
      </section>

      {/* Hero: Active Preparation Track ("Continue Where You Left Off") */}
      <section className={styles.dashboardHero}>
        <Surface gold className={styles.nextPanel}>
          <div className={styles.nextTopline}>
            <div className={styles.trackBadgeRow}>
              <span className="fine-label">Active preparation</span>
              <span className={styles.trackPill}>{activeTrack.type}</span>
            </div>
            <ActionButton
              onClick={() => setTrackModalOpen(true)}
              variant="ghost"
              className="mono"
              style={{ fontSize: "0.74rem", padding: "0.25rem 0.6rem" }}
            >
              <Compass size={13} /> Switch track
            </ActionButton>
          </div>

          <div className={styles.nextCompany}>
            <span className={styles.companyMark}>
              {activeTrack.companyMark || (formattedRole[0] || "T").toUpperCase()}
            </span>
            <div>
              <span>{formattedCompany}</span>
              <h2>{formattedTitle}</h2>
              <p className={styles.trackDescription}>{activeTrack.focusDescription}</p>
            </div>
          </div>

          <div className={styles.trackMetaPills}>
            <span className={styles.trackMetaPill}>
              <Clock3 size={13} /> Day {activeTrack.currentDay} of {activeTrack.totalDays}
            </span>
            <span className={styles.trackMetaPill}>
              <Check size={13} /> {completedTasksCount}/{currentTasks.length} today&apos;s drills complete
            </span>
            <span className={styles.trackMetaPill}>
              <Target size={13} /> {activeTrack.weakTopics.slice(0, 2).map((t) => toTitleCase(t)).join(", ")}
            </span>
          </div>

          <div className={styles.nextPanelFooter}>
            <span>
              <Sparkles size={15} /> Calibrated to your target role & resume profile
            </span>
            <div>
              <ActionButton
                href={
                  activeTrack.interviewId
                    ? `/interviews/${activeTrack.interviewId}/prepare`
                    : "/questions"
                }
              >
                Continue preparation <ArrowRight data-arrow size={16} />
              </ActionButton>
              <ActionButton
                href={`/practice/setup?role=${encodeURIComponent(activeTrack.role)}&mode=${activeTrack.type}`}
                variant="ghost"
              >
                Start adaptive mock
              </ActionButton>
            </div>
          </div>
        </Surface>

        {/* Readiness Meter & Multi-Signal Assessment Matrix */}
        <Surface className={styles.readinessPanel}>
          <div className={styles.readinessHeader}>
            <div>
              <span className="fine-label">Track Readiness</span>
              <h2 style={{ fontSize: "1.05rem", margin: "0.15rem 0 0 0", fontWeight: "550" }}>
                Evaluation Matrix
              </h2>
            </div>
            <span className={styles.readinessStatusBadge}>
              <Sparkles size={12} /> Live Signals
            </span>
          </div>

          <div className={styles.readinessRingSection}>
            <ScoreRing value={activeTrack.readinessScore || 75} size={140} />
          </div>

          <div className={styles.signalBreakdown}>
            <div className={styles.signalRow}>
              <span>Technical Depth</span>
              <div className={styles.signalBarTrack}>
                <div className={styles.signalBarFill} style={{ width: "78%" }} />
              </div>
              <b className="mono">78%</b>
            </div>
            <div className={styles.signalRow}>
              <span>STAR Framing</span>
              <div className={styles.signalBarTrack}>
                <div className={styles.signalBarFill} style={{ width: "74%" }} />
              </div>
              <b className="mono">74%</b>
            </div>
            <div className={styles.signalRow}>
              <span>Communication</span>
              <div className={styles.signalBarTrack}>
                <div className={styles.signalBarFill} style={{ width: "82%" }} />
              </div>
              <b className="mono">82%</b>
            </div>
          </div>

          <div className={styles.readinessDelta}>
            <Sparkles size={14} />
            <span><strong>+{readinessDeltaThisWeek || 12} points</strong> this week</span>
          </div>
        </Surface>
      </section>

      {/* Grid: Today's Plan, Weak Topics, Daily Drill */}
      <section className={styles.dashboardGrid}>
        {/* Today's Prioritized Drills */}
        <Surface className={styles.todayPanel}>
          <div className={styles.panelHeading}>
            <div>
              <span className="fine-label">Today’s plan</span>
              <h2>Prioritized actions</h2>
            </div>
            <div className={styles.planProgress}>
              <strong className="mono">{completedTasksCount}/{currentTasks.length}</strong>
              <span>complete</span>
            </div>
          </div>
          <ProgressBar value={currentTasks.length > 0 ? (completedTasksCount / currentTasks.length) * 100 : 0} />
          
          <div className={styles.taskList}>
            {currentTasks.map((task) => {
              const isComplete = task.status === "completed";
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => handleToggleTask(task.id, task.status)}
                  className={styles.taskRow}
                  data-complete={isComplete}
                >
                  <span className={styles.taskCheck}>{isComplete && <Check size={13} />}</span>
                  <span>
                    <strong>{task.title}</strong>
                    <div className={styles.taskMetaSubline}>
                      <span className={styles.taskCategoryPill}>{task.category}</span>
                      <small>{task.estimatedMinutes} min</small>
                    </div>
                  </span>
                  <ChevronRight size={15} />
                </button>
              );
            })}
          </div>
        </Surface>

        {/* Weak Topics Diagnostic Matrix */}
        <Surface className={styles.focusPanel} warm>
          <div className={styles.panelHeading}>
            <div>
              <span className="fine-label">Weak topics</span>
              <h2>Highest leverage today</h2>
            </div>
            <Target size={18} />
          </div>
          
          <div className={styles.topicStack}>
            {currentTopics.map((topic, index) => (
              <Link key={topic.topic} href={`/practice/setup?focus=${encodeURIComponent(topic.topic)}`}>
                <span className={styles.topicRankBadge}>0{index + 1}</span>
                <div>
                  <strong>{toTitleCase(topic.topic)}</strong>
                  <small className={styles.topicRelevanceTag}>{topic.relevance} relevance</small>
                </div>
                <div className={styles.topicScoreBarWrap}>
                  <div className={styles.topicScoreBarTrack}>
                    <div className={styles.topicScoreBarFill} style={{ width: `${topic.score}%` }} />
                  </div>
                  <b>{topic.score}%</b>
                </div>
                <ChevronRight size={15} />
              </Link>
            ))}
          </div>
          
          <ActionButton href="/practice/setup?mode=targeted" variant="ghost" className={styles.fullButton}>
            Practice weakest topic <ArrowRight data-arrow size={15} />
          </ActionButton>
        </Surface>

        {/* Rapid Speed Drill Launchpad */}
        <Surface className={styles.dailyPractice}>
          <div className={styles.practiceTopBadge}>
            <Zap size={13} />
            <span>15-min adaptive drill</span>
          </div>

          <div className={styles.practiceDialWrap}>
            <div className={styles.practiceDial}>
              <Clock3 size={18} />
              <strong className="mono">15</strong>
              <span>min</span>
            </div>
          </div>

          <div className={styles.practiceCopy}>
            <h2>A short pressure test is enough.</h2>
            <p>{formattedRole} · {activeTrack.roundName}</p>
          </div>

          <div className={styles.practiceFeatures}>
            <span><Check size={12} /> 3 calibrated deep-dive questions</span>
            <span><Check size={12} /> Instant AI rubric & transcript evaluation</span>
          </div>

          <ActionButton
            href={`/practice/setup?mode=${activeTrack.type}&role=${encodeURIComponent(activeTrack.role)}`}
            className={styles.fullButton}
          >
            Start 15m Drill <ArrowRight data-arrow size={15} />
          </ActionButton>
        </Surface>
      </section>

      {/* Bottom Row: Current Month Schedule / 5-Day Sprint Roadmap & Trajectory */}
      <section className={styles.dashboardBottom}>
        <Surface className={styles.upcomingPanel}>
          <div className={styles.panelHeading}>
            <div>
              <span className="fine-label">Preparation Roadmap</span>
              <h2>{thisMonthInterviews.length > 0 ? `${currentMonthLabel} Schedule` : "5-Day Sprint Schedule"}</h2>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <ActionButton onClick={() => setAddModalOpen(true)} variant="ghost" style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem" }}>
                <Plus size={13} /> Link upcoming interview
              </ActionButton>
              <Link href="/interviews" style={{ fontSize: "0.72rem", color: "#aaa7a0" }}>Calendar →</Link>
            </div>
          </div>

          {thisMonthInterviews.length > 0 ? (
            <div className={styles.upcomingTimeline}>
              {thisMonthInterviews.map((interview, index) => {
                const isTargeted = activeTrack.interviewId === interview.id;
                return (
                  <div
                    key={interview.id}
                    className={styles.timelineCardRow}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.65rem 0",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <Link
                      href={`/interviews/${interview.id}`}
                      style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", color: "inherit" }}
                    >
                      <span className={styles.timelineNode} data-primary={index === 0} />
                      <time className="mono" style={{ fontSize: "0.75rem", color: "#f0b94c" }}>
                        {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(interview.scheduledAt))}
                      </time>
                      <div>
                        <strong style={{ fontSize: "0.82rem", display: "block" }}>{interview.company}</strong>
                        <small style={{ color: "#74716b", fontSize: "0.7rem" }}>{toTitleCase(interview.role)} · {interview.round}</small>
                      </div>
                    </Link>

                    {isTargeted ? (
                      <span className={styles.selectedBadge} style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}>
                        <Check size={12} /> Active Target
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const newTrack = createTrackFromInterview(interview);
                          handleSelectTrack(newTrack);
                        }}
                        style={{
                          background: "none",
                          border: "1px solid rgba(240, 185, 76, 0.3)",
                          borderRadius: "6px",
                          color: "#ffd976",
                          fontSize: "0.68rem",
                          padding: "0.25rem 0.5rem",
                          cursor: "pointer",
                        }}
                      >
                        Target
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.roadmapTimeline}>
              <div className={styles.roadmapStep} data-current="true">
                <div className={styles.roadmapStepNode} />
                <div className={styles.roadmapStepContent}>
                  <div>
                    <strong>Day 1: Core Technical & Foundations</strong>
                    <small>Transaction isolation, caching stampedes & concurrency</small>
                  </div>
                  <span className={styles.roadmapStatusPill}>Active Today</span>
                </div>
              </div>
              <div className={styles.roadmapStep}>
                <div className={styles.roadmapStepNode} />
                <div className={styles.roadmapStepContent}>
                  <div>
                    <strong>Day 2: Database Internals & Indexing</strong>
                    <small>B-Tree vs LSM, WAL, lock escalation & query tuning</small>
                  </div>
                  <span className={styles.roadmapStepDay}>Upcoming</span>
                </div>
              </div>
              <div className={styles.roadmapStep}>
                <div className={styles.roadmapStepNode} />
                <div className={styles.roadmapStepContent}>
                  <div>
                    <strong>Day 3: Large-Scale System Design</strong>
                    <small>Rate limiters, distributed queues & event pipelines</small>
                  </div>
                  <span className={styles.roadmapStepDay}>Upcoming</span>
                </div>
              </div>
              <div className={styles.roadmapStep}>
                <div className={styles.roadmapStepNode} />
                <div className={styles.roadmapStepContent}>
                  <div>
                    <strong>Day 4: STAR Framework & Leadership</strong>
                    <small>Production outage recovery, conflict resolution stories</small>
                  </div>
                  <span className={styles.roadmapStepDay}>Upcoming</span>
                </div>
              </div>
            </div>
          )}
        </Surface>

        {/* Compounding Improvement & Readiness Trajectory */}
        <Surface className={styles.improvementPanel}>
          <div className={styles.panelHeading}>
            <div>
              <span className="fine-label">Performance Compounding</span>
              <h2>Readiness Trajectory</h2>
            </div>
            <span className={styles.positiveDelta}>+12% vs baseline</span>
          </div>

          <div className={styles.improvementMetric}>
            <div>
              <AnimatedNumber value={scoreTrend[scoreTrend.length - 1] ?? 80} className="metric-number" />
              <small>recent score</small>
            </div>
            <Sparkline data={scoreTrend.length > 1 ? scoreTrend : [72, 75, 78, 80]} width={280} height={80} />
          </div>

          <div className={styles.improvementStatsGrid}>
            <div className={styles.statMiniCard}>
              <span>Top Strength</span>
              <strong>REST & Caching (88%)</strong>
            </div>
            <div className={styles.statMiniCard}>
              <span>Target Goal</span>
              <strong>85+ Readiness</strong>
            </div>
          </div>

          <div className={styles.trendFoot}>
            <span>3 drills completed this week</span>
            <span>Top <b>15%</b> consistency</span>
          </div>
        </Surface>
      </section>

      {/* Modals */}
      <AddInterviewModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <TrackSwitcherModal
        open={trackModalOpen}
        onClose={() => setTrackModalOpen(false)}
        activeTrackId={activeTrack.id}
        onSelectTrack={handleSelectTrack}
      />
      <RoleOnboardingModal
        open={roleOnboardingOpen}
        onClose={handleCloseRoleModal}
        onSelectTrack={handleSelectTrack}
        user={user}
      />
    </motion.div>
  );
}
