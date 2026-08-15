"use client";

import { Bell, Bot, Check, LockKeyhole, Palette, UserRound } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { SettingsNav } from "@/components/product/settings-nav";
import { ActionButton } from "@/components/ui/buttons";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";

import styles from "../product.module.css";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button className={styles.toggle} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><span /></button>;
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [adaptive, setAdaptive] = useState(true);
  const [strict, setStrict] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [reports, setReports] = useState(true);
  const [motionEnabled, setMotionEnabled] = useState(true);
  const save = () => { setSaved(true); window.setTimeout(() => setSaved(false), 1600); };
  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      <header className={styles.pageHeading}><div><span className={styles.systemStatus}><i /> Product preferences</span><h1>Settings</h1><p>Control how Intervu prepares, interviews, notifies, and retains your data.</p></div><ActionButton onClick={save}>{saved && <Check size={16} />}{saved ? "Saved" : "Save preferences"}</ActionButton></header>
      <div className={styles.settingsLayout}>
        <SettingsNav />
        <div className={styles.settingsContent}>
          <Surface id="ai" className={styles.settingsPanel}>
            <div className={styles.settingsSectionHeading}><Bot size={18} /><div><h2>AI preferences</h2><p>Change interview behavior, not the underlying state machine.</p></div></div>
            <div className={styles.settingRows}>
              <div><span><strong>Adaptive follow-ups</strong><small>Probe missing depth after each answer.</small></span><Toggle checked={adaptive} onChange={setAdaptive} label="Adaptive follow-ups" /></div>
              <div><span><strong>Stricter technical evaluation</strong><small>Weight correctness and trade-offs more heavily.</small></span><Toggle checked={strict} onChange={setStrict} label="Strict technical evaluation" /></div>
              <label><span><strong>Preferred coaching tone</strong><small>Used in reports and recommendations.</small></span><select className="select-field" defaultValue="direct"><option value="direct">Direct and constructive</option><option value="supportive">Supportive and detailed</option><option value="concise">Concise and technical</option></select></label>
            </div>
          </Surface>

          <Surface id="interview" className={styles.settingsPanel}>
            <div className={styles.settingsSectionHeading}><UserRound size={18} /><div><h2>Interview preferences</h2><p>Defaults for new mock interviews.</p></div></div>
            <div className={styles.settingRows}>
              <div><span><strong>Live captions</strong><small>Show editable transcript while answering.</small></span><Toggle checked={captions} onChange={setCaptions} label="Live captions" /></div>
              <label><span><strong>Default interviewer</strong><small>Professional style for new sessions.</small></span><select className="select-field" defaultValue="senior"><option value="senior">Senior engineer</option><option value="neutral">Neutral interviewer</option><option value="strict">Strict technical lead</option></select></label>
              <label><span><strong>Default difficulty</strong><small>You can override this in setup.</small></span><select className="select-field" defaultValue="hard"><option>Normal</option><option value="hard">Hard</option><option>Brutal</option></select></label>
            </div>
          </Surface>

          <Surface id="notifications" className={styles.settingsPanel}>
            <div className={styles.settingsSectionHeading}><Bell size={18} /><div><h2>Notifications</h2><p>Useful reminders, never noise.</p></div></div>
            <div className={styles.settingRows}><div><span><strong>Preparation reminders</strong><small>7 days, 2 days, 24 hours, and 2 hours before.</small></span><Toggle checked={reminders} onChange={setReminders} label="Preparation reminders" /></div><div><span><strong>Report ready</strong><small>Notify when background analysis finishes.</small></span><Toggle checked={reports} onChange={setReports} label="Report notifications" /></div></div>
          </Surface>

          <Surface id="appearance" className={styles.settingsPanel}>
            <div className={styles.settingsSectionHeading}><Palette size={18} /><div><h2>Appearance</h2><p>The black and gold instrument is the launch theme.</p></div></div>
            <div className={styles.settingRows}><div><span><strong>Interface motion</strong><small>Reduced-motion system preferences always take priority.</small></span><Toggle checked={motionEnabled} onChange={setMotionEnabled} label="Interface motion" /></div><label><span><strong>Density</strong><small>Comfortable is recommended.</small></span><select className="select-field"><option>Comfortable</option><option>Compact</option></select></label></div>
          </Surface>

          <Surface id="privacy" className={styles.settingsPanel}>
            <div className={styles.settingsSectionHeading}><LockKeyhole size={18} /><div><h2>Privacy and account</h2><p>Your calendar, resumes, transcripts, and history remain removable.</p></div></div>
            <div className={styles.privacyActions}><button>Delete interview transcripts</button><button>Delete interview history</button><button>Delete account</button></div>
          </Surface>
        </div>
      </div>
    </motion.div>
  );
}
