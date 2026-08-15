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
import { useGetResumeQuery, useUploadResumeMutation } from "@/services/api/documents.api";
import { useGetMeQuery, useUpdateMeMutation } from "@/services/api/system.api";
import type { Resume, User } from "@/types/domain";

import styles from "../product.module.css";

const EXPERIENCE_LEVELS: Array<{ value: User["experienceLevel"]; label: string }> = [
  { value: "early", label: "0–2 years" },
  { value: "mid", label: "3–5 years" },
  { value: "senior", label: "6–9 years" },
  { value: "staff", label: "10+ years" },
];

export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useGetMeQuery();
  const { data: resume, isLoading: resumeLoading } = useGetResumeQuery();

  if (userLoading || resumeLoading || !user) {
    return (
      <motion.div {...pageTransition} className={styles.productPage}>
        <div className={styles.chartSkeleton}><span className="skeleton" /></div>
      </motion.div>
    );
  }

  return <ProfileForm user={user} resume={resume ?? null} />;
}

function ProfileForm({ user, resume }: { user: User; resume: Resume | null }) {
  const router = useRouter();
  const { signOut } = useProduct();
  const fileRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const [updateMe, { isLoading: saving }] = useUpdateMeMutation();
  const [uploadResume] = useUploadResumeMutation();
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [displayName, setDisplayName] = useState(user.displayName);
  const [preferredLanguage, setPreferredLanguage] = useState(user.preferredLanguage);
  const [targetRole, setTargetRole] = useState(user.targetRole);
  const [experienceLevel, setExperienceLevel] = useState(user.experienceLevel);
  const [skills, setSkills] = useState(user.skills);
  const [skillDraft, setSkillDraft] = useState("");

  const save = async () => {
    await updateMe({ displayName, preferredLanguage, targetRole, experienceLevel, skills });
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
        <ActionButton
          className={styles.profileSaveButton}
          onClick={() => void save()}
          disabled={saving}
        >
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
              {saved ? "Saved" : saving ? "Saving…" : "Save changes"}
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
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={`${displayName || "Candidate"} profile`} />
              ) : (
                (displayName || "Candidate")
                  .trim()
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              )}
            </div>
          </div>

          <div className={styles.profileIdentityCopy}>
            <h2>{displayName || "Candidate"}</h2>
            <p>{user.email}</p>
          </div>

          <div className={styles.profileMetaGrid}>
            <div>
              <span className={styles.profileMetaIcon}>
                <MapPin size={15} />
              </span>
              <span>
                <small>Timezone</small>
                <strong>{user.timezone}</strong>
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
              <input
                className="field"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <label className="field-label">
              Preferred language
              <select
                className="select-field"
                value={preferredLanguage}
                onChange={(event) => setPreferredLanguage(event.target.value)}
              >
                <option>English</option>
                <option>Hindi</option>
                <option>Spanish</option>
              </select>
            </label>
            <label className="field-label">
              Primary target role
              <input
                className="field"
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
              />
            </label>
            <label className="field-label">
              Experience level
              <select
                className="select-field"
                value={experienceLevel}
                onChange={(event) =>
                  setExperienceLevel(event.target.value as User["experienceLevel"])
                }
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
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
              <strong>{resume?.fileName ?? "No resume uploaded"}</strong>
              <small>
                {resume
                  ? `PDF · parsed · ${resume.parsedSkills.length} skills found`
                  : "PDF or DOCX · up to 10 MB"}
              </small>
            </div>
            {resume && <Check size={16} />}
          </div>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept=".pdf,.docx"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadResume(file);
            }}
          />
          <ActionButton
            variant="ghost"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={15} />{" "}
            {resume ? "Replace resume" : "Upload resume"}
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
