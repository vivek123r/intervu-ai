import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScratchpadStudio } from "@/components/scratchpad/scratchpad-studio";

describe("ScratchpadStudio", () => {
  it("renders all four studio mode tabs", () => {
    render(<ScratchpadStudio />);

    expect(screen.getByRole("tab", { name: /code sandbox/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /sql studio/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /architecture/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /star notes/i })).toBeInTheDocument();
  });

  it("switches to SQL studio when clicking the SQL tab", () => {
    render(<ScratchpadStudio />);

    const sqlTab = screen.getByRole("tab", { name: /sql studio/i });
    fireEvent.click(sqlTab);

    expect(screen.getByText(/mock postgresql/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run query/i })).toBeInTheDocument();
  });

  it("executes JavaScript code and renders console output", () => {
    render(<ScratchpadStudio initialTab="code" />);

    const runBtn = screen.getByRole("button", { name: /run/i });
    fireEvent.click(runBtn);

    expect(screen.getByText(/execution output/i)).toBeInTheDocument();
  });

  it("calls onArtifactChange with current code payload", () => {
    const handleArtifactChange = vi.fn();
    render(<ScratchpadStudio onArtifactChange={handleArtifactChange} />);

    expect(handleArtifactChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "code",
        language: "typescript",
        content: expect.any(String),
      })
    );
  });
});
