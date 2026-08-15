"use client";

import { Check, FileText, Plus, Upload, UserRound } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";
import { useProduct } from "@/lib/product-store";

import styles from "../product.module.css";

export default function ProfilePage() {
  const { state, setResumeName } = useProduct();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const [skills, setSkills] = useState(["Node.js", "TypeScript", "PostgreSQL", "Redis", "Docker", "AWS"]);
  const [skillDraft, setSkillDraft] = useState("");
  const save = () => { setSaved(true); window.setTimeout(() => setSaved(false), 1800); };

  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      <header className={styles.pageHeading}><div><span className={styles.systemStatus}><i /> Candidate profile</span><h1>Your source of truth</h1><p>Intervu uses this context to choose relevant questions and calibrate expected depth.</p></div><ActionButton onClick={save}>{saved ? <Check size={16} /> : null}{saved ? "Saved" : "Save changes"}</ActionButton></header>
      <div className={styles.profileGrid}>
        <Surface gold className={styles.profileIdentityPanel}>
          <div className={styles.largeAvatar}>AM</div>
          <div><h2>Alex Morgan</h2><p>Senior Backend Engineer</p><span>Asia/Kolkata</span></div>
          <button>Replace photo</button>
        </Surface>
        <Surface className={styles.profileFormPanel}>
          <div className={styles.settingsSectionHeading}><UserRound size={18} /><div><h2>Professional profile</h2><p>Used for role matching and interview context.</p></div></div>
          <div className={styles.profileFields}>
            <label className="field-label">Display name<input className="field" defaultValue="Alex Morgan" /></label>
            <label className="field-label">Preferred language<select className="select-field" defaultValue="English"><option>English</option><option>Hindi</option><option>Spanish</option></select></label>
            <label className="field-label">Primary target role<input className="field" defaultValue="Senior Backend Engineer" /></label>
            <label className="field-label">Experience level<select className="select-field" defaultValue="6–9 years"><option>0–2 years</option><option>3–5 years</option><option>6–9 years</option><option>10+ years</option></select></label>
          </div>
        </Surface>
        <Surface className={styles.resumeProfilePanel}>
          <div className={styles.settingsSectionHeading}><FileText size={18} /><div><h2>Primary resume</h2><p>Parsed once and reused across active interviews.</p></div></div>
          <div className={styles.resumeProfileFile}><span><FileText size={20} /></span><div><strong>{state.resumeName ?? "No resume uploaded"}</strong><small>{state.resumeName ? "PDF · parsed · updated Aug 14" : "PDF or DOCX · up to 10 MB"}</small></div>{state.resumeName && <Check size={16} />}</div>
          <input ref={fileRef} className="sr-only" type="file" accept=".pdf,.docx" onChange={(event) => setResumeName(event.target.files?.[0]?.name ?? null)} />
          <ActionButton variant="ghost" onClick={() => fileRef.current?.click()}><Upload size={15} /> Replace resume</ActionButton>
        </Surface>
        <Surface className={styles.skillsPanel}>
          <div className={styles.settingsSectionHeading}><Plus size={18} /><div><h2>Primary skills</h2><p>These guide question selection but never replace resume evidence.</p></div></div>
          <div className={styles.skillTokens}>{skills.map((skill) => <button key={skill} onClick={() => setSkills((current) => current.filter((item) => item !== skill))}>{skill} <span>×</span></button>)}</div>
          <div className={styles.addSkill}><input className="field" value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)} placeholder="Add a skill" onKeyDown={(event) => { if (event.key === "Enter" && skillDraft.trim()) { setSkills((current) => [...current, skillDraft.trim()]); setSkillDraft(""); } }} /><ActionButton variant="ghost" onClick={() => { if (skillDraft.trim()) { setSkills((current) => [...current, skillDraft.trim()]); setSkillDraft(""); } }}>Add</ActionButton></div>
        </Surface>
      </div>
    </motion.div>
  );
}
