import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "@/app/(product)/dashboard/page";
import type { ActivePreparationTrack } from "@/lib/preparation-track";
import { ACTIVE_TRACK_STORAGE_KEY } from "@/lib/preparation-track";
import { makeStore } from "@/store";
import type { DashboardOverview, User } from "@/types/domain";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard",
}));

const user: User = {
  id: "u1",
  email: "candidate@example.com",
  displayName: "Casey Candidate",
  avatarUrl: null,
  timezone: "UTC",
  targetRole: "Backend Engineer",
  experienceLevel: "mid",
  preferredLanguage: "en",
  skills: [],
  onboardingCompleted: true,
  createdAt: new Date().toISOString(),
};

const track: ActivePreparationTrack = {
  id: "track-1",
  title: "Backend Engineer Track",
  role: "backend-engineer",
  type: "technical",
  roundName: "Round 1",
  source: "role",
  readinessScore: 0,
  currentDay: 1,
  totalDays: 5,
  completedTasks: 0,
  totalTasks: 5,
  weakTopics: [],
  focusDescription: "Calibrated prep",
};

let overview: DashboardOverview;

vi.mock("@/services/api/interviews.api", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useGetDashboardOverviewQuery: () => ({ data: overview, isLoading: false }),
  };
});

vi.mock("@/services/api/system.api", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useGetMeQuery: () => ({ data: user }) };
});

vi.mock("@/services/api/documents.api", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useGetResumeQuery: () => ({ data: undefined }) };
});

vi.mock("@/services/api/preparation.api", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useUpdatePreparationTaskMutation: () => [vi.fn(), { isLoading: false }] };
});

function renderDashboard() {
  const testStore = makeStore();
  return render(
    <Provider store={testStore}>
      <DashboardPage />
    </Provider>,
  );
}

describe("Dashboard page", () => {
  beforeEach(() => {
    window.localStorage.setItem(ACTIVE_TRACK_STORAGE_KEY, JSON.stringify(track));
  });

  it("shows an empty state instead of a fabricated score when there is no trend data", () => {
    overview = {
      nextInterview: null,
      upcomingInterviews: [],
      todayTasks: [],
      weakTopics: [],
      streakDays: 0,
      scoreTrend: [],
      readinessDeltaThisWeek: 0,
    };

    renderDashboard();

    expect(
      screen.getByText("Your score trajectory appears after your first completed mock session."),
    ).toBeInTheDocument();
    expect(screen.getByText("Weak topics appear here after your first completed mock session.")).toBeInTheDocument();
  });

  it("renders a negative readiness delta with a minus sign rather than a hardcoded plus", () => {
    overview = {
      nextInterview: null,
      upcomingInterviews: [],
      todayTasks: [],
      weakTopics: [],
      streakDays: 0,
      scoreTrend: [60, 55],
      readinessDeltaThisWeek: -6,
    };

    renderDashboard();

    expect(screen.getByText("-6 points")).toBeInTheDocument();
    expect(screen.queryByText("+-6 points")).not.toBeInTheDocument();
  });
});
