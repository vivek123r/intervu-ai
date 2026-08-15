"use client";

import { CalendarSync, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { AddInterviewModal } from "@/components/product/add-interview-modal";
import { InterviewCard } from "@/components/product/interview-card";
import { InterviewDetail } from "@/components/product/interview-detail";
import { ActionButton, IconButton } from "@/components/ui/buttons";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";
import { Tabs } from "@/components/ui/tabs";
import type { Interview } from "@/lib/domain";
import { useProduct } from "@/lib/product-store";

import styles from "../product.module.css";

type CalendarView = "month" | "week" | "agenda";

const calendarTabs = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "agenda", label: "Agenda" },
] as const;

function MonthCalendar({ interviews, onSelect }: { interviews: Interview[]; onSelect: (id: string) => void }) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  return (
    <div className={styles.monthCalendar}>
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day} className={styles.weekday}>{day}</span>)}
      {cells.map((day, index) => {
        const dayInterviews = day
          ? interviews.filter((item) => {
              const date = new Date(item.scheduledAt);
              return date.getDate() === day && date.getMonth() === month && date.getFullYear() === year;
            })
          : [];
        return (
          <div key={`${day ?? "empty"}-${index}`} className={styles.calendarCell} data-empty={!day} data-today={day === now.getDate()}>
            {day && <span className="mono">{day}</span>}
            {dayInterviews.map((interview) => (
              <button key={interview.id} onClick={() => onSelect(interview.id)} style={{ "--event-accent": interview.accent } as React.CSSProperties}>
                <i />
                <span>{new Intl.DateTimeFormat("en", { hour: "numeric" }).format(new Date(interview.scheduledAt))}</span>
                <strong>{interview.company}</strong>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function WeekCalendar({ interviews, onSelect }: { interviews: Interview[]; onSelect: (id: string) => void }) {
  const start = new Date();
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => new Date(start.getTime() + index * 86_400_000));
  return (
    <div className={styles.weekCalendar}>
      {days.map((day) => (
        <div key={day.toISOString()}>
          <header><span>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(day)}</span><strong className="mono">{day.getDate()}</strong></header>
          <div>
            {interviews.filter((item) => new Date(item.scheduledAt).toDateString() === day.toDateString()).map((interview) => (
              <button key={interview.id} onClick={() => onSelect(interview.id)}>
                <time className="mono">{new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(interview.scheduledAt))}</time>
                <strong>{interview.company}</strong><span>{interview.round}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InterviewsPage() {
  const { state, selectedInterview, selectInterview, syncCalendar } = useProduct();
  const [view, setView] = useState<CalendarView>("month");
  const [addOpen, setAddOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!window.location.search.includes("add=true")) return;
    const timer = window.setTimeout(() => setAddOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 700px)").matches) return;
    const timer = window.setTimeout(() => setView("agenda"), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSync = () => {
    setSyncing(true);
    window.setTimeout(() => {
      syncCalendar();
      setSyncing(false);
      setSynced(true);
      window.setTimeout(() => setSynced(false), 2200);
    }, 900);
  };

  const sorted = useMemo(
    () => [...state.interviews].sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)),
    [state.interviews],
  );

  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      <header className={styles.pageHeading}>
        <div><span className={styles.systemStatus}><i /> Calendar workspace</span><h1>Upcoming interviews</h1><p>Stay organized, prepare intelligently, and never walk into an interview unprepared.</p></div>
        <div className={styles.pageActions}>
          <ActionButton variant="ghost" onClick={handleSync}><CalendarSync size={16} /> {syncing ? "Syncing…" : synced ? "Synced" : "Sync calendar"}</ActionButton>
          <ActionButton onClick={() => setAddOpen(true)}><Plus size={16} /> Add interview</ActionButton>
        </div>
      </header>

      <section className={styles.calendarWorkspace}>
        <Surface className={styles.calendarSurface}>
          <div className={styles.calendarHeader}>
            <div><IconButton ariaLabel="Previous period"><ChevronLeft size={17} /></IconButton><h2>{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date())}</h2><IconButton ariaLabel="Next period"><ChevronRight size={17} /></IconButton></div>
            <Tabs items={calendarTabs} value={view} onChange={setView} ariaLabel="Calendar view" />
          </div>
          {view === "month" && <MonthCalendar interviews={sorted} onSelect={selectInterview} />}
          {view === "week" && <WeekCalendar interviews={sorted} onSelect={selectInterview} />}
          {view === "agenda" && <div className={styles.agendaView}>{sorted.map((interview) => <InterviewCard key={interview.id} interview={interview} compact />)}</div>}
          <div className={styles.calendarLegend}><span><i data-color="gold" /> Upcoming</span><span><i data-color="purple" /> Confirmed</span><span><i data-color="gray" /> Needs setup</span></div>
        </Surface>
        <Surface gold className={styles.selectedInterviewPanel}><InterviewDetail interview={selectedInterview} /></Surface>
      </section>

      <section className={styles.interviewListSection}>
        <div className={styles.sectionHeadingInline}><div><span className="fine-label">Interview pipeline</span><h2>Every round, one place</h2></div><span>{sorted.length} upcoming</span></div>
        <div className={styles.interviewGrid}>{sorted.map((interview) => <InterviewCard key={interview.id} interview={interview} />)}</div>
      </section>
      <AddInterviewModal open={addOpen} onClose={() => setAddOpen(false)} />
    </motion.div>
  );
}
