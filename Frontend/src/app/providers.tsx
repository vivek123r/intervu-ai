"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";

import { ProductProvider } from "@/lib/product-store";
import { store } from "@/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "spring", stiffness: 330, damping: 30, mass: 0.8 }}
    >
      <Provider store={store}>
        <ProductProvider>{children}</ProductProvider>
      </Provider>
    </MotionConfig>
  );
}
