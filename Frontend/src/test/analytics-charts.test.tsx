import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PerformanceTrendChart, SkillRadarChart } from "@/components/analytics/charts";

describe("PerformanceTrendChart", () => {
  it("renders an empty state instead of a chart of zeros when there is no trend data", () => {
    render(<PerformanceTrendChart scoreTrend={[]} readinessTrend={[]} recentSessions={[]} />);
    expect(
      screen.getByText("Your interview trend will appear here after your first completed mock session."),
    ).toBeInTheDocument();
  });
});

describe("SkillRadarChart", () => {
  it("renders an empty state instead of an invented breakdown when there is no topic data", () => {
    render(<SkillRadarChart topics={[]} />);
    expect(screen.getByText("Skill breakdown appears after your first completed mock session.")).toBeInTheDocument();
  });
});
