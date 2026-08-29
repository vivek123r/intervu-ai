import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import PracticeSetupPage from "@/app/(product)/practice/setup/page";
import { ProductProvider } from "@/lib/product-store";
import { makeStore } from "@/store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/practice/setup",
}));

describe("Practice setup — Evaluation rigor", () => {
  it("exposes the difficulty picker as a radiogroup with the default option checked", async () => {
    render(
      <Provider store={makeStore()}>
        <ProductProvider>
          <PracticeSetupPage />
        </ProductProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("radiogroup", { name: "Evaluation rigor" })).toBeInTheDocument();
    });

    const radios = screen.getAllByRole("radio", { name: /Easy|Normal|Hard|Brutal/ });
    expect(radios).toHaveLength(4);

    const normal = screen.getByRole("radio", { name: /Normal/ });
    expect(normal).toHaveAttribute("aria-checked", "true");

    for (const radio of radios) {
      if (radio !== normal) {
        expect(radio).toHaveAttribute("aria-checked", "false");
      }
    }
  });
});
