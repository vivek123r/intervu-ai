import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CustomSelect } from "@/components/ui/select";

const options = [
  { value: "technical", label: "Technical Round" },
  { value: "system_design", label: "System Design Architecture" },
  { value: "behavioral", label: "Behavioral (STAR Method)" },
];

describe("CustomSelect", () => {
  it("exposes an accessible name via the label prop rather than a dangling <label>", () => {
    render(
      <CustomSelect aria-label="Interview Type" value="technical" options={options} onChange={() => {}} />,
    );

    // A <label> wrapping a <button> never associates — this is the only
    // reliable way a screen reader learns what the trigger is for.
    const trigger = screen.getByRole("button", { name: "Interview Type" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent("Technical Round");
  });

  it("tracks the highlighted option via aria-activedescendant while the trigger keeps focus", () => {
    render(
      <CustomSelect aria-label="Interview Type" value="technical" options={options} onChange={() => {}} />,
    );

    const trigger = screen.getByRole("button", { name: "Interview Type" });
    trigger.focus();
    // First ArrowDown opens the listbox and highlights the current value;
    // the second one actually moves the highlight forward.
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    const highlighted = screen.getByRole("option", { name: "System Design Architecture" });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-activedescendant", highlighted.id);
  });
});
