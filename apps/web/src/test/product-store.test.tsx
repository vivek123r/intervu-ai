import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductProvider, useProduct } from "@/lib/product-store";

function StoreHarness() {
  const { state, toggleTask, connectCalendar, startSession } = useProduct();
  const task = state.preparationTasks[0]!;
  return (
    <div>
      <output aria-label="task-status">{task.status}</output>
      <output aria-label="calendar-status">{String(state.calendarConnected)}</output>
      <output aria-label="session-status">{state.session?.status ?? "none"}</output>
      <button onClick={() => toggleTask(task.id)}>Toggle task</button>
      <button onClick={connectCalendar}>Connect calendar</button>
      <button
        onClick={() =>
          startSession({
            role: "Backend Engineer",
            company: "Northstar Labs",
            type: "technical",
            difficulty: "hard",
            duration: 30,
            focusAreas: ["SQL"],
            interviewerStyle: "Senior engineer",
          })
        }
      >
        Start session
      </button>
    </div>
  );
}

describe("ProductProvider", () => {
  it("persists core demo interactions as real state transitions", async () => {
    window.localStorage.clear();
    render(<ProductProvider><StoreHarness /></ProductProvider>);

    await waitFor(() => expect(screen.getByLabelText("task-status")).toHaveTextContent("completed"));
    fireEvent.click(screen.getByText("Toggle task"));
    expect(screen.getByLabelText("task-status")).toHaveTextContent("pending");

    fireEvent.click(screen.getByText("Connect calendar"));
    expect(screen.getByLabelText("calendar-status")).toHaveTextContent("true");

    fireEvent.click(screen.getByText("Start session"));
    expect(screen.getByLabelText("session-status")).toHaveTextContent("active");
  });
});
