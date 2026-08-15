"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/cn";

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  items: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("tabs", className)} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.value}
          className="tab-button"
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {value === item.value && <motion.span layoutId={`tab-${ariaLabel}`} className="tab-indicator" />}
        </button>
      ))}
    </div>
  );
}
