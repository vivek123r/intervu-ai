import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CompletionScorePanel } from "@/features/practice/components/completion-score-panel";
import { demoCompletion } from "@/mocks/fixtures";
import type { SessionCompletion } from "@/types/domain";

describe("CompletionScorePanel", () => {
  it("does not render an unscored-answers notice when every answer was scored", () => {
    render(<CompletionScorePanel completion={{ ...demoCompletion, unscoredAnswerCount: 0 }} />);
    expect(screen.queryByTestId("unscored-answers-notice")).not.toBeInTheDocument();
  });

  it("renders a factual unscored-answers notice when some answers could not be scored", () => {
    const completion: SessionCompletion = {
      ...demoCompletion,
      scoredAnswerCount: 3,
      unscoredAnswerCount: 2,
    };
    render(<CompletionScorePanel completion={completion} />);

    const notice = screen.getByTestId("unscored-answers-notice");
    expect(notice).toHaveTextContent("This score reflects 3 of 5 answers");
    expect(notice).toHaveTextContent("2 couldn't be scored.");
  });

  it("shows an offline badge and hides the signature breakdown when the report was generated offline", () => {
    render(<CompletionScorePanel completion={{ ...demoCompletion, generatedOffline: true }} />);

    expect(screen.getByTestId("generated-offline-badge")).toBeInTheDocument();
    expect(screen.getByText(/generated offline, so its per-dimension breakdown/i)).toBeInTheDocument();
  });

  it("renders the signature breakdown and no offline badge for a normal report", () => {
    render(<CompletionScorePanel completion={{ ...demoCompletion, generatedOffline: false }} />);

    expect(screen.queryByTestId("generated-offline-badge")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/generated offline, so its per-dimension breakdown/i),
    ).not.toBeInTheDocument();
  });

  it("no longer renders an invented cohort standing", () => {
    render(<CompletionScorePanel completion={demoCompletion} />);
    expect(screen.queryByText(/top \d+%/i)).not.toBeInTheDocument();
    expect(screen.getByText("Questions answered")).toBeInTheDocument();
  });
});
