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

import type { PracticeConfig, ProductState } from "@/types/domain";
import {
  getFirebaseUserProfile,
  subscribeToFirebaseAuth,
  signOutFromGoogle,
  type FirebaseUserProfile,
} from "@/lib/firebase/client";

const STORAGE_KEY = "intervu-ai-state-v2";

export const initialProductState: ProductState = {
  signedIn: false,
  onboardingCompleted: false,
  calendarConnected: false,
  calendarLastSync: null,
  userName: "",
  userEmail: null,
  userPhotoUrl: null,
  preparationTasks: [],
  resumeName: null,
  jobDescription: "",
  session: null,
  reports: [],
  notifications: [],
};

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
        update((current) => ({
          ...current,
          signedIn: true,
          userName: profile.name,
          userEmail: profile.email,
          userPhotoUrl: profile.photoUrl,
        })),
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
            questions: [],
            currentQuestionIndex: 0,
            answers: [],
            startedAt: new Date().toISOString(),
          },
        })),
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
    [update],
  );

  return <ProductContext.Provider value={{ state, ...actions }}>{children}</ProductContext.Provider>;
}

export function useProduct() {
  const context = useContext(ProductContext);
  if (!context) throw new Error("useProduct must be used inside ProductProvider");
  return context;
}
