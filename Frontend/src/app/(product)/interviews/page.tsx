"use client";

import { CalendarSync, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { AddInterviewModal } from "@/features/interviews/components/add-interview-modal";
import { InterviewCard } from "@/features/interviews/components/interview-card";
import { InterviewDetail } from "@/features/interviews/components/interview-detail";
import { ActionButton, IconButton } from "@/components/ui/buttons";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";
import { Tabs } from "@/components/ui/tabs";
import { useCreateInterviewMutation, useGetInterviewsQuery } from "@/services/api/interviews.api";
import { useConnectCalendarMutation, useSyncCalendarMutation } from "@/services/api/calendar.api";
import {
  connectGoogleCalendarWithOAuth,
  fetchGoogleCalendarEvents,
  getStoredGoogleCalendarEmail,
  getStoredGoogleCalendarToken,
  parseGoogleCalendarEventsToInterviews,
  saveStoredGoogleCalendarInterviews,
} from "@/lib/google-calendar";
import { firebaseIsConfigured } from "@/lib/firebase/client";
import type { Interview } from "@/types/domain";

import styles from "../product.module.css";

type CalendarView = "month" | "week" | "agenda";

const calendarTabs = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "agenda", label: "Agenda" },
] as const;

function MonthCalendar({
  activeDate,
  interviews,
  onSelect,
}: {
  activeDate: Date;
  interviews: Interview[];
  onSelect: (id: string) => void;
}) {
  const now = new Date();
  const month = activeDate.getMonth();
  const year = activeDate.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  const isCurrentMonthView = now.getMonth() === month && now.getFullYear() === year;

  return (
    <div className={styles.monthCalendar}>
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
        <span key={day} className={styles.weekday}>
          {day}
        </span>
      ))}
      {cells.map((day, index) => {
        const dayInterviews = day
          ? interviews.filter((item) => {
              const date = new Date(item.scheduledAt);
              return date.getDate() === day && date.getMonth() === month && date.getFullYear() === year;
            })
          : [];
        return (
          <div
            key={`${day ?? "empty"}-${index}`}
            className={styles.calendarCell}
            data-empty={!day}
            data-today={isCurrentMonthView && day === now.getDate()}
          >
            {day && <span className="mono">{day}</span>}
            {dayInterviews.map((interview) => (
              <button
                key={interview.id}
                onClick={() => onSelect(interview.id)}
                style={{ "--event-accent": interview.accent } as React.CSSProperties}
              >
                <i />
                <span>
                  {new Intl.DateTimeFormat("en", {
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(interview.scheduledAt))}
                </span>
                <strong>{interview.company}</strong>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function WeekCalendar({
  activeDate,
  interviews,
  onSelect,
}: {
  activeDate: Date;
  interviews: Interview[];
  onSelect: (id: string) => void;
}) {
  const current = new Date(activeDate);
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(current.setDate(diff));

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    return d;
  });

  const now = new Date();

  return (
    <div className={styles.weekCalendar}>
      {weekDays.map((date) => {
        const isToday =
          date.getDate() === now.getDate() &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear();

        const dayInterviews = interviews.filter((item) => {
          const itemDate = new Date(item.scheduledAt);
          return (
            itemDate.getDate() === date.getDate() &&
            itemDate.getMonth() === date.getMonth() &&
            itemDate.getFullYear() === date.getFullYear()
          );
        });

        return (
          <div key={date.toISOString()} className={styles.weekColumn} data-today={isToday}>
            <div className={styles.weekColumnHeader}>
              <span>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(date)}</span>
              <strong className="mono">{date.getDate()}</strong>
            </div>
            <div className={styles.weekEvents}>
              {dayInterviews.map((interview) => (
                <button
                  key={interview.id}
                  onClick={() => onSelect(interview.id)}
                  className={styles.weekEventCard}
                  style={{ "--event-accent": interview.accent } as React.CSSProperties}
                >
                  <div>
                    <span className="mono">
                      {new Intl.DateTimeFormat("en", {
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(interview.scheduledAt))}
                    </span>
                    <strong>{interview.company}</strong>
                  </div>
                  <small>{interview.role}</small>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function InterviewsPage() {
  const { data: interviews, isLoading } = useGetInterviewsQuery();
  const [createInterview] = useCreateInterviewMutation();
  const [connectCalendar] = useConnectCalendarMutation();
  const [syncCalendar] = useSyncCalendarMutation();
  const [view, setView] = useState<CalendarView>("month");
  const [activeDate, setActiveDate] = useState<Date>(() => new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const handleSync = async () => {
    setSyncing(true);
    try {
      let token = getStoredGoogleCalendarToken();

      // If no token exists yet, prompt user for Google Calendar OAuth consent
      if (!token) {
        if (firebaseIsConfigured()) {
          const authResult = await connectGoogleCalendarWithOAuth();
          if (authResult?.accessToken) {
            token = authResult.accessToken;
            await connectCalendar().unwrap();
          }
        }
      }

      if (token) {
        const email = getStoredGoogleCalendarEmail();
        const rawEvents = await fetchGoogleCalendarEvents(token);
        const parsedInterviews = parseGoogleCalendarEventsToInterviews(rawEvents, email || undefined);
        saveStoredGoogleCalendarInterviews(parsedInterviews);

        const existingList = interviews || [];
        for (const item of parsedInterviews) {
          const itemTime = new Date(item.scheduledAt).getTime();
          const isDuplicate = existingList.some((existing) => {
            const existingTime = new Date(existing.scheduledAt).getTime();
            return (
              existing.company.trim().toLowerCase() === item.company.trim().toLowerCase() &&
              Math.abs(existingTime - itemTime) < 60_000
            );
          });

          if (!isDuplicate) {
            try {
              await createInterview({
                company: item.company,
                role: item.role,
                type: item.type,
                scheduledAt: item.scheduledAt,
                timezone: item.timezone,
              }).unwrap();
            } catch {
              // Best effort per event
            }
          }
        }
      }

      await syncCalendar().unwrap();
      setSynced(true);
      window.setTimeout(() => setSynced(false), 2200);
    } catch (err) {
      console.warn("Calendar sync notice:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handlePrevPeriod = () => {
    setActiveDate((prev) => {
      const next = new Date(prev);
      if (view === "week") {
        next.setDate(next.getDate() - 7);
      } else {
        next.setMonth(next.getMonth() - 1);
      }
      return next;
    });
  };

  const handleNextPeriod = () => {
    setActiveDate((prev) => {
      const next = new Date(prev);
      if (view === "week") {
        next.setDate(next.getDate() + 7);
      } else {
        next.setMonth(next.getMonth() + 1);
      }
      return next;
    });
  };

  const sorted = useMemo(
    () =>
      [...(interviews ?? [])]
        .filter((item) => {
          const text = `${item.company} ${item.role} ${item.round}`.toLowerCase();
          // Filter out routine personal tasks and reminders
          if (
            /\b(?:recharge|mobile|top-up|prepaid|postpaid|bill|payment|rent|emi|installment|dentist|doctor|gym|movie|flight)\b/i.test(
              text,
            )
          ) {
            return false;
          }
          if (
            item.company === "Scheduled Meeting" &&
            !/\b(?:interview|screening|recruiter|technical|coding|system\s+design|hiring\s+manager|round\s*\d+)\b/i.test(
              text,
            )
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)),
    [interviews],
  );
  const selectedInterview = sorted.find((item) => item.id === selectedId) ?? sorted[0];

  if (isLoading) {
    return (
      <motion.div {...pageTransition} className={styles.productPage}>
        <div className={styles.chartSkeleton}>
          <span className="skeleton" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...pageTransition} className={`${styles.productPage} ${styles.calendarPage}`}>
      <header className={styles.pageHeading}>
        <div>
          <span className={styles.systemStatus}>
            <i /> Calendar workspace
          </span>
          <h1>Upcoming interviews</h1>
          <p>Stay organized, prepare intelligently, and never walk into an interview unprepared.</p>
        </div>
        <div className={styles.pageActions}>
          <ActionButton variant="ghost" onClick={() => void handleSync()}>
            <CalendarSync size={16} /> {syncing ? "Syncing…" : synced ? "Synced" : "Sync calendar"}
          </ActionButton>
          <ActionButton onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add interview
          </ActionButton>
        </div>
      </header>

      <section className={styles.calendarWorkspace}>
        <Surface className={styles.calendarSurface}>
          <div className={styles.calendarHeader}>
            <div>
              <IconButton ariaLabel="Previous period" onClick={handlePrevPeriod}>
                <ChevronLeft size={17} />
              </IconButton>
              <h2>{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(activeDate)}</h2>
              <IconButton ariaLabel="Next period" onClick={handleNextPeriod}>
                <ChevronRight size={17} />
              </IconButton>
            </div>
            <Tabs items={calendarTabs} value={view} onChange={setView} ariaLabel="Calendar view" />
          </div>
          {view === "month" && <MonthCalendar activeDate={activeDate} interviews={sorted} onSelect={setSelectedId} />}
          {view === "week" && <WeekCalendar activeDate={activeDate} interviews={sorted} onSelect={setSelectedId} />}
          {view === "agenda" && (
            <div className={styles.agendaView}>
              {sorted.map((interview) => (
                <InterviewCard key={interview.id} interview={interview} compact />
              ))}
            </div>
          )}
          <div className={styles.calendarLegend}>
            <span>
              <i data-color="gold" /> Upcoming
            </span>
            <span>
              <i data-color="purple" /> Confirmed
            </span>
            <span>
              <i data-color="gray" /> Needs setup
            </span>
          </div>
        </Surface>
        {selectedInterview ? (
          <Surface gold className={styles.selectedInterviewPanel}>
            <InterviewDetail interview={selectedInterview} />
          </Surface>
        ) : (
          <Surface gold className={styles.selectedInterviewPanel}>
            <div className={styles.emptyPipeline}>
              <CalendarSync size={28} />
              <h3>No interview selected</h3>
              <p>Add an interview or connect Google Calendar to track rounds and build preparation plans.</p>
              <ActionButton onClick={() => setAddOpen(true)}>
                <Plus size={16} /> Add interview
              </ActionButton>
            </div>
          </Surface>
        )}
      </section>

      <section className={styles.interviewListSection}>
        <div className={styles.sectionHeadingInline}>
          <div>
            <span className="fine-label">Interview pipeline</span>
            <h2>Every round, one place</h2>
          </div>
          <span>{sorted.length} upcoming</span>
        </div>
        <div className={styles.interviewGrid}>
          {sorted.map((interview) => (
            <InterviewCard key={interview.id} interview={interview} />
          ))}
          {sorted.length === 0 && (
            <div className={styles.emptyPipelineCard}>
              <span>No interviews in your pipeline yet.</span>
              <ActionButton variant="ghost" onClick={() => setAddOpen(true)}>
                <Plus size={15} /> Add your first interview
              </ActionButton>
            </div>
          )}
        </div>
      </section>
      <AddInterviewModal open={addOpen} onClose={() => setAddOpen(false)} />
    </motion.div>
  );
}


