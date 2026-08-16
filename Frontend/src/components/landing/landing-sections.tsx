"use client";

import {
  ArrowDown,
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  Check,
  FileText,
  MessageSquareText,
  Sparkles,
  Target,
} from "lucide-react";
import { AIOrb } from "@/components/ui/ai-orb";
import { ActionButton } from "@/components/ui/buttons";
import { AnimatedNumber, Reveal } from "@/components/ui/motion";
import { Sparkline } from "@/components/ui/sparkline";
import { Surface } from "@/components/ui/surface";
import { Waveform } from "@/components/ui/waveform";
import { scoreTrend } from "@/mocks/fixtures";

import styles from "@/app/landing.module.css";

export function LandingSections() {
  return (
    <>
      <section
        id="how-it-works"
        className={`${styles.storySection} section-space page-frame`}
      >
        <Reveal className={styles.sectionIntro}>
          <h2 className="section-title">
            Your calendar knows when. Intervu knows what comes next.
          </h2>
          <p className="lede">
            One continuous preparation loop turns an ordinary event into
            role-specific practice and a measurable plan.
          </p>
        </Reveal>

        <div className={styles.signalJourney}>
          <div className={styles.journeyRail} aria-hidden="true" />
          {[
            {
              number: "01",
              title: "Interview detected",
              copy: "Intervu reads only the calendar details it needs, ranks likely interviews, and asks you to confirm.",
              icon: CalendarCheck,
              signalKey: "detected",
              signalLabel: "INTERVIEW DETECTED",
            },
            {
              number: "02",
              title: "Context assembled",
              copy: "Your resume, the job description, the round, and past performance become one focused role model.",
              icon: BriefcaseBusiness,
              signalKey: "journey-context",
              signalLabel: "CONTEXT ASSEMBLED",
            },
            {
              number: "03",
              title: "Practice adapts",
              copy: "The interviewer probes incomplete answers, changes depth, and remembers the weak signals that matter.",
              icon: MessageSquareText,
              signalKey: "practice-adapts",
              signalLabel: "PRACTICE ADAPTS",
            },
            {
              number: "04",
              title: "Evidence becomes action",
              copy: "Every report resolves to the next best drill, not a wall of charts you have to interpret alone.",
              icon: Target,
              signalKey: "evidence-action",
              signalLabel: "EVIDENCE BECOMES ACTION",
            },
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal
                key={step.number}
                className={styles.journeyStep}
                delay={index * 0.05}
              >
                <span className={`${styles.journeyNumber} mono`}>
                  {step.number}
                </span>
                <span
                  className={styles.journeyIcon}
                  data-signal-anchor={step.signalKey}
                  data-signal-label={step.signalLabel}
                  data-signal-order={String(index + 1)}
                  data-signal-route="journey"
                >
                  <Icon size={21} />
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section id="product" className={styles.intelligenceSection}>
        <div className={`${styles.intelligenceInner} page-frame section-space`}>
          <Reveal className={styles.intelligenceCopy}>
            <h2 className="section-title">
              Preparation shaped around your evidence—not generic question
              banks.
            </h2>
            <p className="lede">
              Intervu identifies the distance between what the role needs and
              what your resume proves, then spends your limited time where it
              changes the outcome.
            </p>
            <div className={styles.intelligenceNotes}>
              <span>
                <Check size={15} /> Deterministic role-match weighting
              </span>
              <span>
                <Check size={15} /> Context-aware question generation
              </span>
              <span>
                <Check size={15} /> Weak topics reorder after every session
              </span>
            </div>
          </Reveal>

          <Reveal className={styles.contextMachine} delay={0.08}>
            <div className={styles.contextSources}>
              <Surface className={styles.contextSource}>
                <FileText size={18} />
                <span>Resume</span>
                <small>Skills · projects · impact</small>
              </Surface>
              <Surface className={styles.contextSource}>
                <BriefcaseBusiness size={18} />
                <span>Job description</span>
                <small>Requirements · seniority · scope</small>
              </Surface>
              <Surface className={styles.contextSource}>
                <Target size={18} />
                <span>Past performance</span>
                <small>Weakness · trend · urgency</small>
              </Surface>
            </div>
            <div
              className={styles.contextMerge}
              data-signal-anchor="context"
              data-signal-label="CONTEXT ASSEMBLED"
              data-signal-order="5"
            >
              <span />
              <Sparkles size={18} />
              <span />
            </div>
            <Surface gold className={styles.contextOutput}>
              <div>
                <small className="fine-label">Today’s focus</small>
                <strong>SQL transactions</strong>
                <p>Two focused drills before the system-design mock.</p>
              </div>
              <div className={styles.focusMeter}>
                <span style={{ width: "68%" }} />
              </div>
              <ActionButton href="/login" variant="ghost">
                Open your plan <ArrowRight data-arrow size={16} />
              </ActionButton>
            </Surface>
          </Reveal>
        </div>
      </section>

      <section className={`${styles.mockSection} page-frame section-space`}>
        <Reveal className={styles.mockVisual}>
          <div className={styles.mockAmbient} />
          <div
            className={styles.mockOrbAnchor}
            data-signal-anchor="interviewer"
            data-signal-label="INTERVIEWER LIVE"
            data-signal-order="6"
            data-signal-orbit-ratio="0.42"
          >
            <AIOrb speaking />
          </div>
          <div className={styles.mockWave}>
            <Waveform active />
          </div>
          <span className={styles.mockLive}>
            <i /> AI interviewer · Live
          </span>
        </Reveal>
        <Reveal className={styles.mockCopy} delay={0.08}>
          <h2 className="section-title">A question becomes a conversation.</h2>
          <p className="lede">
            Static scripts stop at your first answer. Intervu listens for
            missing depth and follows the thread—without flashing scores while
            you are speaking.
          </p>
          <div className={styles.questionThread}>
            <div>
              <span>01</span>
              <p>Why did you use Redis?</p>
            </div>
            <div>
              <span>↳</span>
              <p>What exactly were you caching?</p>
            </div>
            <div>
              <span>↳</span>
              <p>What fails if Redis goes offline?</p>
            </div>
          </div>
          <ActionButton href="/practice/setup">
            Enter the interview room <ArrowRight data-arrow size={16} />
          </ActionButton>
        </Reveal>
      </section>

      <section id="analysis" className={styles.analysisSection}>
        <div className={`${styles.analysisInner} page-frame section-space`}>
          <Reveal className={styles.analysisHeading}>
            <h2 className="section-title">
              Know what worked, what was missing, and how to answer it again.
            </h2>
          </Reveal>
          <Reveal className={styles.analysisConsole} delay={0.06}>
            <div
              className={styles.analysisLead}
              data-signal-anchor="evidence"
              data-signal-label="EVIDENCE SCORED"
              data-signal-order="7"
              data-signal-dock="top-left"
            >
              <div>
                <small>Interview complete</small>
                <strong>
                  <AnimatedNumber value={82} /> <span>/ 100</span>
                </strong>
              </div>
              <p>
                Strong technical instincts. Your next gain is structure:
                decision, trade-off, then measurable evidence.
              </p>
            </div>
            <div className={styles.analysisScores}>
              {[
                ["Technical", 84],
                ["Communication", 81],
                ["Structure", 76],
                ["Clarity", 88],
              ].map(([label, score]) => (
                <div key={String(label)}>
                  <span>{label}</span>
                  <strong className="mono">{score}</strong>
                  <i>
                    <b style={{ width: `${score}%` }} />
                  </i>
                </div>
              ))}
            </div>
            <div className={styles.answerPreview}>
              <div className={styles.answerScore}>
                <span className="mono">8.2</span>
                <small>/10</small>
              </div>
              <div>
                <strong>How did you keep cached data correct?</strong>
                <p>
                  You named invalidation ownership and a failure fallback. Add
                  stampede protection and one observed outcome.
                </p>
              </div>
              <ActionButton
                href="/practice/results/report-demo-01"
                variant="ghost"
              >
                Review answer
              </ActionButton>
            </div>
          </Reveal>
        </div>
      </section>

      <section
        className={`${styles.improvementSection} page-frame section-space`}
      >
        <Reveal className={styles.improvementCopy}>
          <h2 className="section-title">
            Practice compounds when the next session knows the last one.
          </h2>
          <p className="lede">
            Readiness blends performance, role coverage, task completion, recent
            momentum, and weak-topic recovery.
          </p>
        </Reveal>
        <Reveal className={styles.trendConsole} delay={0.08}>
          <div className={styles.trendHeader}>
            <div>
              <span>Readiness</span>
              <strong>
                <AnimatedNumber value={85} suffix="%" />
              </strong>
            </div>
            <div>
              <span>Improvement</span>
              <strong className="gold-text">+23%</strong>
            </div>
            <small>Last 30 days</small>
          </div>
          <div className={styles.largeTrend}>
            <span
              className={styles.trendSignalAnchor}
              data-signal-anchor="momentum"
              data-signal-label="MOMENTUM BUILDING"
              data-signal-order="8"
              data-signal-trace="momentum"
              data-signal-trace-point="start"
            />
            <span
              className={styles.trendSignalAnchor}
              data-signal-anchor="momentum-complete"
              data-signal-label="MOMENTUM COMPOUNDS"
              data-signal-order="9"
              data-signal-trace="momentum"
              data-signal-trace-point="end"
              data-signal-trigger-distance="360"
            />
            <Sparkline
              data={scoreTrend}
              width={660}
              height={180}
              signalTrace="momentum"
            />
          </div>
          <div className={styles.trendLegend}>
            <span>
              <i /> Mock score
            </span>
            <small>12 focused sessions</small>
          </div>
        </Reveal>
      </section>

      <section className={`${styles.finalCta} page-frame`}>
        <div className={styles.ctaSignal} aria-hidden="true">
          <ArrowDown size={18} />
        </div>
        <Reveal>
          <h2>Your next interview deserves better preparation.</h2>
          <p>Start with the interview already on your calendar.</p>
          <ActionButton
            href="/login"
            signalAnchor="next-move"
            signalLabel="YOUR NEXT MOVE"
            signalOrder={10}
          >
            Start preparing <ArrowRight data-arrow size={17} />
          </ActionButton>
        </Reveal>
      </section>
    </>
  );
}
