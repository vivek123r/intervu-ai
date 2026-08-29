import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import AnalyticsPage from "@/app/(product)/analytics/page";
import { makeStore } from "@/store";
import type { AnalyticsOverview } from "@/types/domain";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/analytics",
}));

const overview: AnalyticsOverview = {
  overallScore: 82,
  readinessScore: 79,
  streakDays: 3,
  improvementPercent: 12,
  scoreTrend: [70, 75, 82],
  readinessTrend: [65, 72, 79],
  microMetrics: [],
  topicPerformance: [
    { topic: "System design", score: 88, trend: 4, relevance: "high" },
    { topic: "Behavioral", score: 60, trend: -2, relevance: "critical" },
  ],
  recentSessions: [
    { reportId: "r1", company: "Acme", mode: "Technical mock", score: 82, completedAt: new Date().toISOString() },
  ],
};

vi.mock("@/services/api/analytics.api", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useGetAnalyticsOverviewQuery: () => ({ data: overview, isLoading: false }),
  };
});

function renderAnalyticsPage() {
  const testStore = makeStore();
  return render(
    <Provider store={testStore}>
      <AnalyticsPage />
    </Provider>,
  );
}

describe("Analytics page", () => {
  it("renders a relevance label, not a bogus percentage, for the enum field", () => {
    renderAnalyticsPage();

    expect(screen.getByText("High priority")).toBeInTheDocument();
    expect(screen.getByText("Critical focus")).toBeInTheDocument();
    expect(screen.queryByText(/high% relevance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/critical% relevance/i)).not.toBeInTheDocument();
  });
});
