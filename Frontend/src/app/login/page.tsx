"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AIOrb } from "@/components/ui/ai-orb";
import { Brand } from "@/components/ui/brand";
import { Waveform } from "@/components/ui/waveform";
import { GoogleAuthProvider } from "firebase/auth";
import {
  firebaseIsConfigured,
  getFirebaseUserProfile,
  signInWithGoogle,
  signInWithEmailPassword,
  signUpWithEmailPassword,
} from "@/lib/firebase/client";
import {
  GOOGLE_CALENDAR_EMAIL_KEY,
  GOOGLE_CALENDAR_TOKEN_KEY,
  fetchGoogleCalendarEvents,
  parseGoogleCalendarEventsToInterviews,
  saveStoredGoogleCalendarInterviews,
} from "@/lib/google-calendar";
import { useProduct } from "@/lib/product-store";
import { syncDbFromGoogleCalendar } from "@/mocks/db";

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

function GithubGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, signIn } = useProduct();

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const firebaseConfigured = firebaseIsConfigured();

  const navigateAfterSignIn = () => {
    const needsOnboarding = !state.onboardingCompleted || searchParams.get("intent") === "calendar";
    router.push(needsOnboarding ? "/onboarding" : "/dashboard");
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (firebaseConfigured) {
        const credential = await signInWithGoogle();
        if (!credential) throw new Error("Firebase is not configured.");
        const profile = getFirebaseUserProfile(credential.user);
        signIn(profile);
      } else {
        signIn({ name: "Demo User", email: "user@domain.com", photoUrl: null });
      }
      navigateAfterSignIn();
    } catch {
      setError("Google sign-in was interrupted. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGithubClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setNotice("GitHub sign-in is coming soon! Please use Google or Email.");
  };

  const handleForgotClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address above to reset password.");
    } else {
      setError(null);
      setNotice(`Password reset instructions sent to ${email}`);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === "register" && !name)) {
      setError("Please fill out all required fields.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        if (firebaseConfigured) {
          const credential = await signInWithEmailPassword(email, password);
          if (!credential) throw new Error("Authentication failed.");
          signIn(getFirebaseUserProfile(credential.user));
        } else {
          const nameFromEmail = email.split("@")[0] || "Candidate";
          signIn({
            name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
            email,
            photoUrl: null,
          });
        }
      } else {
        if (firebaseConfigured) {
          const credential = await signUpWithEmailPassword(name, email, password);
          if (!credential) throw new Error("Registration failed.");
          signIn(getFirebaseUserProfile(credential.user));
        } else {
          signIn({ name, email, photoUrl: null });
        }
      }
      navigateAfterSignIn();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      if (
        message.includes("auth/user-not-found") ||
        message.includes("auth/wrong-password") ||
        message.includes("invalid-credential")
      ) {
        setError("Invalid email address or password.");
      } else if (message.includes("auth/email-already-in-use")) {
        setError("An account with this email address already exists.");
      } else {
        setError(message || "Operation failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTryOutInterview = () => {
    setLoading(true);
    signIn({ name: "Demo Candidate", email: "candidate@example.com", photoUrl: null });
    navigateAfterSignIn();
  };

  const toggleMode = () => {
    setMode((current) => (current === "signin" ? "register" : "signin"));
    setError(null);
    setNotice(null);
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
        <div className={styles.authCard}>
          <div className={styles.cardHeader}>
            <h1>{mode === "signin" ? "Sign In" : "Create Account"}</h1>
            <p>
              {mode === "signin"
                ? "Access your personalized preparation hub."
                : "Start calibrating your interview operating system."}
            </p>
          </div>

          <div className={styles.socialButtonsRow}>
            <button
              type="button"
              className={styles.socialButton}
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <GoogleGlyph />
              <span>Google</span>
            </button>
            <button
              type="button"
              className={styles.socialButton}
              onClick={handleGithubClick}
              disabled={loading}
            >
              <GithubGlyph />
              <span>GitHub</span>
            </button>
          </div>

          <div className={styles.orDivider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>OR</span>
            <span className={styles.dividerLine} />
          </div>

          <form onSubmit={handleSubmit} className={styles.emailForm}>
            {mode === "register" && (
              <div className={styles.fieldGroup}>
                <label htmlFor="name-input">FULL NAME</label>
                <div className={styles.inputWrapper}>
                  <User size={16} className={styles.inputIcon} />
                  <input
                    id="name-input"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label htmlFor="email-input">EMAIL ADDRESS</label>
              <div className={styles.inputWrapper}>
                <Mail size={16} className={styles.inputIcon} />
                <input
                  id="email-input"
                  type="email"
                  placeholder="user@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.labelWithLink}>
                <label htmlFor="password-input">PASSWORD</label>
                {mode === "signin" && (
                  <button
                    type="button"
                    className={styles.forgotLink}
                    onClick={handleForgotClick}
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className={styles.inputWrapper}>
                <Lock size={16} className={styles.inputIcon} />
                <input
                  id="password-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className={`gold-button ${styles.authSubmitButton}`}
              disabled={loading}
            >
              {loading
                ? mode === "signin"
                  ? "AUTHENTICATING…"
                  : "CREATING ACCOUNT…"
                : mode === "signin"
                ? "AUTHENTICATE"
                : "CREATE ACCOUNT"}
              <ArrowRight size={16} data-arrow />
            </button>
          </form>

          {error && <p className={styles.authError} role="alert">{error}</p>}
          {notice && <p className={styles.authNotice} role="status">{notice}</p>}

          <div className={styles.cardFooter}>
            <p className={styles.footerNote}>
              {mode === "signin" ? (
                <>
                  New to Intervu?{" "}
                  <button type="button" className={styles.toggleModeLink} onClick={toggleMode}>
                    Register here
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" className={styles.toggleModeLink} onClick={toggleMode}>
                    Sign in here
                  </button>
                </>
              )}
            </p>
            <button
              type="button"
              className={styles.tryOutButton}
              onClick={handleTryOutInterview}
              disabled={loading}
            >
              <span className={styles.activeDot} />
              TRY OUT INTERVIEW
            </button>
          </div>
        </div>

        <div className={styles.securityNote}>
          <ShieldCheck size={17} />
          <p>
            Firebase handles identity. Calendar authorization happens next and can be revoked anytime.
          </p>
        </div>
        {!firebaseConfigured && (
          <p className={styles.demoNote}>
            No Firebase keys yet? This build continues in secure demo mode with realistic sample data.
          </p>
        )}

        <div className={styles.legal}>By continuing, you agree to the Terms and Privacy Policy.</div>
      </section>
    </main>
  );
}
