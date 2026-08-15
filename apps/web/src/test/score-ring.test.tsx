import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScoreRing } from "@/components/ui/score-ring";

describe("ScoreRing", () => {
  it("exposes the score without relying on color", () => {
    render(<ScoreRing value={85} label="Readiness" />);
    expect(screen.getByLabelText("Readiness: 85 out of 100")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
  });
});
