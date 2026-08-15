"use client";

import { ArrowLeft, ArrowRight, CalendarDays, Check, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AIOrb } from "@/components/ui/ai-orb";
import { Brand } from "@/components/ui/brand";
import { Waveform } from "@/components/ui/waveform";
import { signInWithGoogle } from "@/lib/firebase/client";
import { useProduct } from "@/lib/product-store";

import styles from "../auth.module.css";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.42l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.87a6 6 0 0 1 0-3.74V7.51H3.04a10 10 0 0 0 0 8.98l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 6c1.47 0 2.78.5 3.82 1.5l2.88-2.88A9.66 9.66 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, signIn } = useProduct();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      signIn();
      const needsOnboarding = !state.onboardingCompleted || searchParams.get("intent") === "calendar";
      router.push(needsOnboarding ? "/onboarding" : "/dashboard");
    } catch {
      setError("Google sign-in was interrupted. Your demo state is still safe—try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.authPage}>
      <div className={styles.authGlow} />
      <section className={styles.authVisual} aria-label="Intervu interview signal visualization">
        <div className={styles.visualBrand}><Brand /></div>
        <AIOrb speaking compact />
        <div className={styles.authWave}><Waveform active /></div>
        <blockquote>“Tell me about the trade-off you chose—not just the tool.”</blockquote>
        <div className={styles.authSignals}>
          <span><CalendarDays size={15} /> Interview detected</span>
          <span><Sparkles size={15} /> Preparation calibrated</span>
          <span><Check size={15} /> Feedback converted to action</span>
        </div>
      </section>

      <section className={styles.authPanel}>
        <Link href="/" className={styles.backLink}><ArrowLeft size={15} /> Back to Intervu</Link>
        <div className={styles.authForm}>
          <span className="gold-status"><i className="status-dot" /> Your interview operating system</span>
          <div>
            <h1>Prepare for the role that’s actually on your calendar.</h1>
            <p>Sign in once. Calendar access stays a separate, read-only permission you control.</p>
          </div>
          <button className={styles.googleButton} onClick={handleSignIn} disabled={loading}>
            <GoogleGlyph />
            {loading ? "Opening Google…" : "Continue with Google"}
            <ArrowRight size={16} />
          </button>
          {error && <p className={styles.authError} role="alert">{error}</p>}
          <div className={styles.securityNote}>
            <ShieldCheck size={17} />
            <p>
              Firebase handles identity. Calendar authorization happens next and can be revoked anytime.
            </p>
          </div>
          <p className={styles.demoNote}>
            No Firebase keys yet? This build continues in secure demo mode with realistic sample data.
          </p>
        </div>
        <div className={styles.legal}>By continuing, you agree to the Terms and Privacy Policy.</div>
      </section>
    </main>
  );
}
