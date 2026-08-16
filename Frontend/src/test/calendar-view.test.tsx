import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import InterviewsPage from "@/app/(product)/interviews/page";
import { ProductProvider } from "@/lib/product-store";
import { store } from "@/store";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/interviews",
}));

function renderInterviewsPage() {
  return render(
    <Provider store={store}>
      <ProductProvider>
        <InterviewsPage />
      </ProductProvider>
    </Provider>,
  );
}

describe("Interviews / Calendar Page", () => {
  it("renders calendar and allows navigating months", async () => {
    renderInterviewsPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Upcoming interviews" })).toBeInTheDocument();
    });

    const now = new Date();
    const currentMonthLabel = new Intl.DateTimeFormat("en", {
      month: "long",
      year: "numeric",
    }).format(now);

    expect(screen.getByRole("heading", { name: currentMonthLabel })).toBeInTheDocument();

    // Click next period button
    const nextBtn = screen.getByLabelText("Next period");
    fireEvent.click(nextBtn);

    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthLabel = new Intl.DateTimeFormat("en", {
      month: "long",
      year: "numeric",
    }).format(nextMonth);

    expect(screen.getByRole("heading", { name: nextMonthLabel })).toBeInTheDocument();

    // Click Previous period button
    const prevBtn = screen.getByLabelText("Previous period");
    fireEvent.click(prevBtn);

    expect(screen.getByRole("heading", { name: currentMonthLabel })).toBeInTheDocument();
  });

  it("switches to week view and allows navigating weeks", async () => {
    renderInterviewsPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Upcoming interviews" })).toBeInTheDocument();
    });

    // Switch to Week view tab
    const weekTab = screen.getByRole("tab", { name: "Week" });
    fireEvent.click(weekTab);

    // Should render weekdays Mon..Sun headers
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();

    // Click Next period in week view
    const nextBtn = screen.getByLabelText("Next period");
    fireEvent.click(nextBtn);

    // Click Previous period
    const prevBtn = screen.getByLabelText("Previous period");
    fireEvent.click(prevBtn);
  });

  it("allows selecting an interview event to preview in detail panel", async () => {
    renderInterviewsPage();

    await waitFor(() => {
      expect(screen.getAllByText("Northstar Labs").length).toBeGreaterThan(0);
    });

    // Clicking an interview in the list or calendar selects it
    const eventButtons = screen.getAllByRole("button", { name: /Northstar Labs/i });
    expect(eventButtons.length).toBeGreaterThan(0);

    fireEvent.click(eventButtons[0]!);

    // Detail panel displays Northstar Labs details
    expect(screen.getAllByRole("heading", { name: "Senior Backend Engineer" }).length).toBeGreaterThan(0);
  });
});
