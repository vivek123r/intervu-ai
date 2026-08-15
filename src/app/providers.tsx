"use client";

import { MotionConfig } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";

import { ProductProvider } from "@/lib/product-store";
import { store } from "@/store";

const MOCKING_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/**
 * Delays rendering until MSW is intercepting, so no request can race ahead of the mock layer —
 * see docs/ARCHITECTURE.md's Runtime boundaries. No-op (resolves immediately) once
 * NEXT_PUBLIC_API_MOCKING is unset for a real backend.
 */
function useMockingReady() {
  const [ready, setReady] = useState(!MOCKING_ENABLED);

  useEffect(() => {
    if (!MOCKING_ENABLED) return;
    let cancelled = false;
    import("@/mocks/browser").then(({ startMocking }) =>
      startMocking().then(() => {
        if (!cancelled) setReady(true);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}

export function Providers({ children }: { children: ReactNode }) {
  const mockingReady = useMockingReady();

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "spring", stiffness: 330, damping: 30, mass: 0.8 }}
    >
      <Provider store={store}>
        <ProductProvider>{mockingReady ? children : null}</ProductProvider>
      </Provider>
    </MotionConfig>
  );
}
