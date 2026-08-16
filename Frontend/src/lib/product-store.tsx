"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { InterviewReport, PracticeConfig, ProductState, SessionAnswer } from "@/types/domain";
import {
  getFirebaseUserProfile,
  subscribeToFirebaseAuth,
  signOutFromGoogle,
  type FirebaseUserProfile,
} from "@/lib/firebase/client";
import { db } from "@/mocks/db";
import { demoReport, initialProductState, interviewQuestions } from "@/mocks/fixtures";

const STORAGE_KEY = "intervu-ai-state-v2";

/**
 * Client-only state not yet migrated to a Redux slice or RTK Query — see
 * docs/STATE-MANAGEMENT.md. Interviews were the first feature migrated off this store
 * (see src/services/api/interviews.api.ts); the rest move over one at a time.
 */
interface ProductActions {
  signIn: (profile: FirebaseUserProfile) => void;
  signOut: () => Promise<void>;
  completeOnboarding: () => void;
  connectCalendar: () => void;
  syncCalendar: () => void;
  disconnectCalendar: () => void;
  toggleTask: (id: string) => void;
  setResumeName: (name: string | null) => void;
  setJobDescription: (value: string) => void;
  startSession: (config: PracticeConfig) => void;
  submitAnswer: (transcript: string, durationSeconds: number) => void;
  completeSession: (pendingAnswer?: SessionAnswer) => InterviewReport;
  clearSession: () => void;
  markNotificationsRead: () => void;
  resetDemo: () => void;
}

interface ProductContextValue extends ProductActions {
  state: ProductState;
}

const ProductContext = createContext<ProductContextValue | null>(null);

function loadState(): ProductState {
  if (typeof window === "undefined") return initialProductState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? ({ ...initialProductState, ...JSON.parse(raw) } as ProductState) : initialProductState;
  } catch {
    return initialProductState;
  }
}

export function ProductProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProductState>(initialProductState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setState(loadState());
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const update = useCallback((recipe: (current: ProductState) => ProductState) => {
    setState((current) => recipe(current));
  }, []);

  useEffect(() => {
    if (!hydrated || process.env.NEXT_PUBLIC_AUTH_MODE !== "firebase") return;

    return subscribeToFirebaseAuth((user) => {
      if (!user) {
        update((current) => ({ ...current, signedIn: false }));
        return;
      }

      update((current) => ({
        ...current,
        signedIn: true,
        ...getFirebaseUserProfile(user),
      }));
    });
  }, [hydrated, update]);

  const actions = useMemo<ProductActions>(
    () => ({
      signIn: (profile) =>
        update((current) => {
          db.user = {
            ...db.user,
            displayName: profile.name,
            email: profile.email || db.user.email,
            avatarUrl: profile.photoUrl,
          };
          return {
            ...current,
            signedIn: true,
            userName: profile.name,
            userEmail: profile.email,
            userPhotoUrl: profile.photoUrl,
          };
        }),
      signOut: async () => {
        try {
          await signOutFromGoogle();
        } finally {
          update((current) => ({
            ...current,
            signedIn: false,
            userName: "",
            userEmail: null,
            userPhotoUrl: null,
          }));
        }
      },
      completeOnboarding: () =>
        update((current) => ({ ...current, signedIn: true, onboardingCompleted: true })),
      connectCalendar: () =>
        update((current) => ({
          ...current,
          calendarConnected: true,
          calendarLastSync: new Date().toISOString(),
        })),
      syncCalendar: () =>
        update((current) => ({ ...current, calendarLastSync: new Date().toISOString() })),
      disconnectCalendar: () =>
        update((current) => ({ ...current, calendarConnected: false, calendarLastSync: null })),
      toggleTask: (id) =>
        update((current) => ({
          ...current,
          preparationTasks: current.preparationTasks.map((task) =>
            task.id === id
              ? { ...task, status: task.status === "completed" ? "pending" : "completed" }
              : task,
          ),
        })),
      setResumeName: (resumeName) => update((current) => ({ ...current, resumeName })),
      setJobDescription: (jobDescription) =>
        update((current) => ({ ...current, jobDescription })),
      startSession: (config) =>
        update((current) => ({
          ...current,
          session: {
            id: `session-${Date.now()}`,
            status: "active",
            config,
            questions: interviewQuestions,
            currentQuestionIndex: 0,
            answers: [],
            startedAt: new Date().toISOString(),
          },
        })),
      submitAnswer: (transcript, durationSeconds) =>
        update((current) => {
          if (!current.session) return current;
          const question = current.session.questions[current.session.currentQuestionIndex];
          if (!question) return current;
          const score = Math.min(9.2, 6.4 + transcript.trim().split(/\s+/).length / 45);
          const nextIndex = Math.min(
            current.session.currentQuestionIndex + 1,
            current.session.questions.length - 1,
          );
          return {
            ...current,
            session: {
              ...current.session,
              currentQuestionIndex: nextIndex,
              answers: [
                ...current.session.answers,
                {
                  questionId: question.id,
                  question: question.text,
                  transcript,
                  durationSeconds,
                  score,
                },
              ],
            },
          };
        }),
      completeSession: (pendingAnswer) => {
        const sessionAnswers = state.session?.answers ?? [];
        const reportAnswers = pendingAnswer && !sessionAnswers.some((answer) => answer.questionId === pendingAnswer.questionId)
          ? [...sessionAnswers, pendingAnswer]
          : sessionAnswers;
        const report = {
          ...demoReport,
          id: `report-${Date.now()}`,
          sessionId: state.session?.id ?? demoReport.sessionId,
          createdAt: new Date().toISOString(),
          answers:
            reportAnswers.length
              ? reportAnswers.map((answer) => ({
                  question: answer.question,
                  answer: answer.transcript,
                  score: Number(answer.score.toFixed(1)),
                  strengths: [
                    "Used a concrete implementation example",
                    "Stayed relevant to the question",
                  ],
                  missing: ["A measurable outcome", "One explicit trade-off"],
                  betterStructure: ["Decision", "Reason", "Trade-off", "Evidence"],
                }))
              : demoReport.answers,
        };
        update((current) => ({
          ...current,
          session: current.session ? { ...current.session, status: "completed" } : null,
          reports: [report, ...current.reports],
        }));
        return report;
      },
      clearSession: () => update((current) => ({ ...current, session: null })),
      markNotificationsRead: () =>
        update((current) => ({
          ...current,
          notifications: current.notifications.map((item) => ({ ...item, read: true })),
        })),
      resetDemo: () => {
        window.localStorage.removeItem(STORAGE_KEY);
        setState(initialProductState);
      },
    }),
    [state.session, update],
  );

  return <ProductContext.Provider value={{ state, ...actions }}>{children}</ProductContext.Provider>;
}

export function useProduct() {
  const context = useContext(ProductContext);
  if (!context) throw new Error("useProduct must be used inside ProductProvider");
  return context;
}
