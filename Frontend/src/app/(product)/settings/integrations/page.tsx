"use client";

import { CalendarCheck, CalendarSync, Check, ExternalLink, Link2, ShieldCheck, Unplug } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { SettingsNav } from "@/components/product/settings-nav";
import { ActionButton } from "@/components/ui/buttons";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";
import {
  useConnectCalendarMutation,
  useDisconnectCalendarMutation,
  useGetCalendarConnectionQuery,
  useSyncCalendarMutation,
} from "@/services/api/calendar.api";

import styles from "../../product.module.css";

export default function IntegrationsPage() {
  const { data: connection, isLoading } = useGetCalendarConnectionQuery();
  const [connectCalendar] = useConnectCalendarMutation();
  const [syncCalendar] = useSyncCalendarMutation();
  const [disconnectCalendar] = useDisconnectCalendarMutation();
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  if (isLoading || !connection) {
    return (
      <motion.div {...pageTransition} className={styles.productPage}>
        <div className={styles.chartSkeleton}><span className="skeleton" /></div>
      </motion.div>
    );
  }

  const sync = async () => {
    setSyncing(true);
    await syncCalendar();
    setSyncing(false);
    setSynced(true);
    window.setTimeout(() => setSynced(false), 1800);
  };

  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      <header className={styles.pageHeading}><div><span className={styles.systemStatus}><i /> External connections</span><h1>Integrations</h1><p>Calendar consent is separate from sign-in, encrypted server-side, and revocable at any time.</p></div></header>
      <div className={styles.settingsLayout}>
        <SettingsNav />
        <div className={styles.settingsContent}>
          <Surface gold={connection.connected} className={styles.integrationHero}>
            <div className={styles.integrationLogo}>G</div>
            <div><span className="fine-label">Google Calendar</span><h2>{connection.connected ? "Connected" : "Not connected"}</h2><p>{connection.connected ? "Upcoming events are available for interview detection." : "Connect with the minimum read-only Calendar scope."}</p></div>
            <span className={styles.connectionState} data-connected={connection.connected}>{connection.connected ? <><Check size={14} /> Connected</> : <><Unplug size={14} /> Offline</>}</span>
          </Surface>
          {connection.connected ? (
            <Surface className={styles.connectionDetails}>
              <div className={styles.settingsSectionHeading}><CalendarCheck size={18} /><div><h2>Connection details</h2><p>OAuth credentials never reach this browser.</p></div></div>
              <dl><div><dt>Account</dt><dd>{connection.accountEmail}</dd></div><div><dt>Permission</dt><dd>Calendar events · read only</dd></div><div><dt>Last sync</dt><dd>{connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString() : "Not synced yet"}</dd></div><div><dt>Status</dt><dd className="gold-text">{connection.status ?? "Unknown"}</dd></div></dl>
              <div className={styles.connectionActions}><ActionButton onClick={sync} variant="ghost"><CalendarSync size={15} /> {syncing ? "Syncing…" : synced ? "Sync complete" : "Sync now"}</ActionButton><button onClick={() => void disconnectCalendar()}><Unplug size={15} /> Disconnect</button></div>
            </Surface>
          ) : (
            <Surface className={styles.connectCalendarEmpty}>
              <CalendarSync size={28} />
              <div><h2>Bring upcoming interviews into focus.</h2><p>Intervu applies a cheap heuristic first, uses AI only for ambiguous candidates, and always asks you to confirm.</p></div>
              <ActionButton onClick={() => void connectCalendar()}><Link2 size={15} /> Connect Google Calendar</ActionButton>
            </Surface>
          )}
          <Surface className={styles.oauthArchitecture}>
            <div className={styles.settingsSectionHeading}><ShieldCheck size={18} /><div><h2>How authorization is protected</h2><p>Designed for the production Google OAuth flow.</p></div></div>
            <div className={styles.securityFlow}><span>Browser consent</span><i /><span>FastAPI callback</span><i /><span>Encrypted token store</span><i /><span>Read-only sync</span></div>
            <ul><li><Check size={14} /> Refresh tokens never enter localStorage or client-readable cookies.</li><li><Check size={14} /> OAuth state is signed and short-lived.</li><li><Check size={14} /> Disconnect revokes provider access and retains existing interview records.</li></ul>
            <a href="https://developers.google.com/calendar/api/auth" target="_blank" rel="noreferrer">Google Calendar permission details <ExternalLink size={14} /></a>
          </Surface>
        </div>
      </div>
    </motion.div>
  );
}
