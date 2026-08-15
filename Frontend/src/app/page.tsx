import { ArrowRight, CalendarDays } from "lucide-react";

import { HeroConsole } from "@/components/landing/hero-console";
import { LandingSections } from "@/components/landing/landing-sections";
import { ScrollSignal } from "@/components/landing/scroll-signal";
import { MarketingNav } from "@/components/shell/marketing-nav";
import { AmbientField } from "@/components/ui/ambient-field";
import { ActionButton } from "@/components/ui/buttons";
import { Brand } from "@/components/ui/brand";
import { Reveal } from "@/components/ui/motion";

import styles from "./landing.module.css";

export default function LandingPage() {
  return (
    <div className={styles.landing} data-signal-root>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <MarketingNav />
      <ScrollSignal />
      <main id="main-content">
        <section className={`${styles.hero} page-frame`}>
          <AmbientField density={24} />
          <Reveal className={styles.heroCopy}>
            <h1 className="display-title">
              Turn every <span className="gold-text">interview</span> into your <span className="gold-text">advantage.</span>
            </h1>
            <p className="lede">
              Calendar-aware preparation, realistic AI interviews, and actionable feedback designed
              around the role you’re actually interviewing for.
            </p>
            <div className={styles.heroActions}>
              <ActionButton href="/practice/setup">
                Start mock interview <ArrowRight data-arrow size={17} />
              </ActionButton>
              <ActionButton href="/login?intent=calendar" variant="ghost">
                <CalendarDays size={17} /> Connect calendar
              </ActionButton>
            </div>
            <div className={styles.heroTrust}>
              <span>Calendar read-only</span>
              <i />
              <span>Mock mode included</span>
              <i />
              <span>Your data stays yours</span>
            </div>
          </Reveal>
          <Reveal className={styles.heroVisual} delay={0.08}>
            <HeroConsole />
          </Reveal>
        </section>
        <LandingSections />
      </main>
      <footer className={`${styles.footer} page-frame`}>
        <Brand />
        <p>Interview preparation that compounds.</p>
        <div><a href="/settings">Privacy</a><a href="/settings">Terms</a></div>
      </footer>
    </div>
  );
}
