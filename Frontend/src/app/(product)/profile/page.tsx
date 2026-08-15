"use client";

/* Firebase profile photos can come from several Google-managed hosts. */
/* eslint-disable @next/next/no-img-element */

import {
  Check,
  FileText,
  LogOut,
  MapPin,
  Plus,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";
import { useProduct } from "@/lib/product-store";

import styles from "../product.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const { state, setResumeName, signOut } = useProduct();
  const fileRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const [saved, setSaved] = useState(false);
  const [skills, setSkills] = useState([
    "Node.js",
    "TypeScript",
    "PostgreSQL",
    "Redis",
    "Docker",
    "AWS",
  ]);
  const [skillDraft, setSkillDraft] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const addSkill = () => {
    const nextSkill = skillDraft.trim();
    if (!nextSkill) return;

    setSkills((current) => {
      const alreadyAdded = current.some(
        (skill) => skill.toLowerCase() === nextSkill.toLowerCase(),
      );
      return alreadyAdded ? current : [...current, nextSkill];
    });
    setSkillDraft("");
  };

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      <header
        className={`${styles.pageHeading} ${styles.profilePageHeading}`}
        data-saved={saved}
      >
        <div>
          <span className={styles.systemStatus}>
            <i /> Candidate profile
          </span>
          <h1>Your source of truth</h1>
          <p>
            Intervu uses this context to choose relevant questions and calibrate
            expected depth.
          </p>
        </div>
        <ActionButton className={styles.profileSaveButton} onClick={save}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={saved ? "saved" : "save"}
              className={styles.profileSaveState}
              initial={
                reduceMotion ? false : { opacity: 0, y: 4, filter: "blur(2px)" }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -4, filter: "blur(2px)" }
              }
              transition={{
                duration: reduceMotion ? 0 : 0.16,
                ease: [0.22, 1, 0.36, 1],
              }}
              aria-live="polite"
            >
              {saved ? <Check size={16} /> : null}
              {saved ? "Saved" : "Save changes"}
            </motion.span>
          </AnimatePresence>
        </ActionButton>
      </header>

      <div className={styles.profileGrid}>
        <Surface gold className={styles.profileIdentityPanel}>
          <div className={styles.profileIdentityTopline}>
            <span>Identity signal</span>
            <strong>
              <i /> Google
            </strong>
          </div>

          <div className={styles.profilePortraitStage}>
            <div className={styles.largeAvatar}>
              {state.userPhotoUrl ? (
                <img
                  src={state.userPhotoUrl}
                  alt={`${state.userName} profile`}
                />
              ) : (
                state.userName
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              )}
            </div>
          </div>

          <div className={styles.profileIdentityCopy}>
            <h2>{state.userName}</h2>
            <p>{state.userEmail ?? "Google account"}</p>
          </div>

          <div className={styles.profileMetaGrid}>
            <div>
              <span className={styles.profileMetaIcon}>
                <MapPin size={15} />
              </span>
              <span>
                <small>Timezone</small>
                <strong>Asia/Kolkata</strong>
              </span>
            </div>
            <div>
              <span className={styles.profileMetaIcon}>
                <ShieldCheck size={15} />
              </span>
              <span>
                <small>Identity</small>
                <strong>Google account</strong>
              </span>
            </div>
          </div>

          <div className={styles.profileIdentityFooter}>
            <div className={styles.profileSyncNote}>
              <ShieldCheck size={14} />
              <span>Photo and account details synced from Google</span>
            </div>
            <button
              className={styles.profileLogoutButton}
              onClick={() => void handleSignOut()}
              disabled={loggingOut}
            >
              <LogOut size={14} /> {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </Surface>

        <Surface
          className={`${styles.profileFormPanel} ${styles.profileContentPanel}`}
        >
          <div className={styles.settingsSectionHeading}>
            <span className={styles.profileSectionIcon}>
              <UserRound size={17} />
            </span>
            <div>
              <h2>Professional profile</h2>
              <p>Used for role matching and interview context.</p>
            </div>
          </div>
          <div className={styles.profileFields}>
            <label className="field-label">
              Display name
              <input className="field" defaultValue={state.userName} />
            </label>
            <label className="field-label">
              Preferred language
              <select className="select-field" defaultValue="English">
                <option>English</option>
                <option>Hindi</option>
                <option>Spanish</option>
              </select>
            </label>
            <label className="field-label">
              Primary target role
              <input className="field" defaultValue="Senior Backend Engineer" />
            </label>
            <label className="field-label">
              Experience level
              <select className="select-field" defaultValue="6–9 years">
                <option>0–2 years</option>
                <option>3–5 years</option>
                <option>6–9 years</option>
                <option>10+ years</option>
              </select>
            </label>
          </div>
        </Surface>

        <Surface
          className={`${styles.resumeProfilePanel} ${styles.profileContentPanel}`}
        >
          <div className={styles.settingsSectionHeading}>
            <span className={styles.profileSectionIcon}>
              <FileText size={17} />
            </span>
            <div>
              <h2>Primary resume</h2>
              <p>Parsed once and reused across active interviews.</p>
            </div>
          </div>
          <div className={styles.resumeProfileFile}>
            <span>
              <FileText size={20} />
            </span>
            <div>
              <strong>{state.resumeName ?? "No resume uploaded"}</strong>
              <small>
                {state.resumeName
                  ? "PDF · parsed · updated Aug 14"
                  : "PDF or DOCX · up to 10 MB"}
              </small>
            </div>
            {state.resumeName && <Check size={16} />}
          </div>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept=".pdf,.docx"
            onChange={(event) =>
              setResumeName(event.target.files?.[0]?.name ?? null)
            }
          />
          <ActionButton
            variant="ghost"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={15} />{" "}
            {state.resumeName ? "Replace resume" : "Upload resume"}
          </ActionButton>
        </Surface>

        <Surface
          className={`${styles.skillsPanel} ${styles.profileContentPanel}`}
        >
          <div className={styles.settingsSectionHeading}>
            <span className={styles.profileSectionIcon}>
              <Plus size={17} />
            </span>
            <div>
              <h2>Primary skills</h2>
              <p>
                These guide question selection but never replace resume
                evidence.
              </p>
            </div>
          </div>
          <div className={styles.skillTokens}>
            <AnimatePresence initial={false}>
              {skills.map((skill) => (
                <motion.button
                  layout
                  key={skill}
                  type="button"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.86 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={
                    reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.86 }
                  }
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.18,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  onClick={() =>
                    setSkills((current) =>
                      current.filter((item) => item !== skill),
                    )
                  }
                  aria-label={`Remove ${skill}`}
                >
                  {skill} <span aria-hidden="true">×</span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
          <div className={styles.addSkill}>
            <input
              className="field"
              value={skillDraft}
              onChange={(event) => setSkillDraft(event.target.value)}
              placeholder="Add a skill"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addSkill();
                }
              }}
            />
            <ActionButton
              variant="ghost"
              onClick={addSkill}
              disabled={!skillDraft.trim()}
            >
              Add
            </ActionButton>
          </div>
        </Surface>
      </div>
    </motion.div>
  );
}
