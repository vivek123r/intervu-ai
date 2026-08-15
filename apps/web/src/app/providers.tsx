"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

import { ProductProvider } from "@/lib/product-store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "spring", stiffness: 330, damping: 30, mass: 0.8 }}
    >
      <ProductProvider>{children}</ProductProvider>
    </MotionConfig>
  );
}
