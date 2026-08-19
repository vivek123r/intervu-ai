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
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AIOrb } from "@/components/ui/ai-orb";
import { ActionButton } from "@/components/ui/buttons";
import { AnimatedNumber, Reveal } from "@/components/ui/motion";
import { Sparkline } from "@/components/ui/sparkline";
import { Surface } from "@/components/ui/surface";
import { Waveform } from "@/components/ui/waveform";
import { scoreTrend } from "@/mocks/fixtures";

import styles from "@/app/landing.module.css";

interface ScoreMetric {
  label: string;
  score: number;
}

const ANALYSIS_METRICS: ScoreMetric[] = [
  { label: "Technical", score: 84 },
  { label: "Communication", score: 81 },
  { label: "Structure", score: 76 },
  { label: "Clarity", score: 88 },
];

function AnalysisScoreItem({
  label,
  score,
  delay = 0,
  active = false,
}: {
  label: string;
  score: number;
  delay?: number;
  active: boolean;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (!active) {
      count.set(0);
      return;
    }
    const timer = setTimeout(() => {
      const controls = animate(count, score, {
        duration: 0.85,
        ease: [0.22, 1, 0.36, 1],
      });
      return () => controls.stop();
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [active, count, delay, score]);

  return (
    <div className={styles.analysisScoreItem} data-active={active}>
      <span>{label}</span>
      <strong className="mono" data-active={active}>
        <motion.span>{rounded}</motion.span>
      </strong>
      <i>
        <b
          data-active={active}
          style={{
            width: active ? `${score}%` : "0%",
            transition: `width 850ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
          }}
        />
      </i>
    </div>
  );
}

function AnalysisScoresGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [row1Active, setRow1Active] = useState(false);
  const [row2Active, setRow2Active] = useState(false);
  const [exitActive, setExitActive] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkSignalState = () => {
      const topAnchor = container.querySelector<HTMLElement>(
        '[data-signal-anchor="scores-start"]',
      );
      const midAnchor = container.querySelector<HTMLElement>(
        '[data-signal-anchor="scores-mid"]',
      );
      const endAnchor = container.querySelector<HTMLElement>(
        '[data-signal-anchor="scores-end"]',
      );

      const topActive =
        topAnchor?.dataset.signalActive === "true" ||
        topAnchor?.dataset.signalVisited === "true";
      const midActive =
        midAnchor?.dataset.signalActive === "true" ||
        midAnchor?.dataset.signalVisited === "true";
      const endActive =
        endAnchor?.dataset.signalActive === "true" ||
        endAnchor?.dataset.signalVisited === "true";

      setRow1Active(Boolean(topActive || midActive || endActive));
      setRow2Active(Boolean(midActive || endActive));
      setExitActive(Boolean(endActive));
    };

    checkSignalState();

    const observer = new MutationObserver(checkSignalState);
    observer.observe(container, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-signal-active", "data-signal-visited"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={styles.analysisScores}>
      <span
        className={styles.scoresSignalAnchorTop}
        data-signal-anchor="scores-start"
        data-signal-label="ANALYZING SCORES"
        data-signal-order="7"
      />
      <span
        className={styles.scoresSignalAnchorMid}
        data-signal-anchor="scores-mid"
        data-signal-label="EVIDENCE SCORED"
        data-signal-order="8"
      />
      <span
        className={styles.scoresSignalAnchorBottom}
        data-signal-anchor="scores-end"
        data-signal-label="SCORES COMPLETE"
        data-signal-order="9"
      />

      <span
        className={styles.scoresTouchRippleTop}
        data-ignited={row1Active}
        aria-hidden="true"
      />
      <span
        className={styles.scoresTouchRippleMid}
        data-ignited={row2Active}
        aria-hidden="true"
      />
      <span
        className={styles.scoresTouchRippleBottom}
        data-ignited={exitActive}
        aria-hidden="true"
      />

      <span
        className={styles.scoresDividerLaser}
        data-ignited={row2Active}
        aria-hidden="true"
      />

      {ANALYSIS_METRICS.map((metric, index) => {
        const isRow1 = index < 2;
        const isRowActive = isRow1 ? row1Active : row2Active;
        const stagger = (index % 2) * 0.08;
        return (
          <AnalysisScoreItem
            key={metric.label}
            label={metric.label}
            score={metric.score}
            delay={stagger}
            active={isRowActive}
          />
        );
      })}
    </div>
  );
}

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
            <div className={styles.analysisLead}>
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
            <AnalysisScoresGrid />
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
              data-signal-order="10"
              data-signal-trace="momentum"
              data-signal-trace-point="start"
            />
            <span
              className={styles.trendSignalAnchor}
              data-signal-anchor="momentum-complete"
              data-signal-label="MOMENTUM COMPOUNDS"
              data-signal-order="11"
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
            signalOrder={12}
          >
            Start preparing <ArrowRight data-arrow size={17} />
          </ActionButton>
        </Reveal>
      </section>
    </>
  );
}
