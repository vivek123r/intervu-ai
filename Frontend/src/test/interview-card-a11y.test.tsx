import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InterviewCard } from "@/features/interviews/components/interview-card";
import { demoInterviews } from "@/mocks/fixtures";

describe("InterviewCard", () => {
  it("is reachable and operable by keyboard via a real link, not a bare clickable div", () => {
    const interview = demoInterviews[0]!;
    render(<InterviewCard interview={interview} />);

    const primaryLink = screen.getByRole("link", { name: new RegExp(interview.company) });
    expect(primaryLink).toHaveAttribute("href", `/interviews/${interview.id}`);

    // A real <a> is in the tab order and focusable without any extra
    // role/tabIndex/keydown wiring.
    primaryLink.focus();
    expect(primaryLink).toHaveFocus();
  });

  it("keeps Prepare/Mock actions as siblings, not nested inside the primary link", () => {
    const interview = demoInterviews[0]!;
    render(<InterviewCard interview={interview} />);

    const primaryLink = screen.getByRole("link", { name: new RegExp(interview.company) });
    const prepareLink = screen.getByRole("link", { name: /Prepare/ });
    expect(primaryLink).not.toContainElement(prepareLink);
  });
});
