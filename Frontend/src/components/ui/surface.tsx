"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  warm?: boolean;
  gold?: boolean;
  interactive?: boolean;
  reveal?: boolean;
}

export function Surface({
  children,
  className,
  warm,
  gold,
  interactive,
  reveal = false,
  onPointerMove,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  ...props
}: SurfaceProps) {
  const handlePointerMove: SurfaceProps["onPointerMove"] = (event) => {
    if (interactive) {
      const bounds = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
      event.currentTarget.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
    }
    onPointerMove?.(event);
  };

  // A Surface that's given an onClick is a clickable card with no native
  // affordance of its own — without this it's an unfocusable, unannounced
  // div. Only kicks in when the consumer actually wires up onClick; a plain
  // decorative Surface stays a plain div.
  const isClickable = typeof onClick === "function";
  const handleKeyDown: SurfaceProps["onKeyDown"] = (event) => {
    if (isClickable && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
    }
    onKeyDown?.(event);
  };

  const classes = cn(
    "surface",
    warm && "surface-warm",
    gold && "gold-surface",
    interactive && "surface-interactive",
    className,
  );

  const interactiveProps = isClickable
    ? {
        role: role ?? "button",
        tabIndex: tabIndex ?? 0,
        onClick,
        onKeyDown: handleKeyDown,
      }
    : { role, tabIndex, onClick, onKeyDown };

  if (reveal) {
    return (
      <motion.div
        className={classes}
        initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        onPointerMove={handlePointerMove}
        {...interactiveProps}
        {...(props as HTMLMotionProps<"div">)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={classes} onPointerMove={handlePointerMove} {...interactiveProps} {...props}>
      {children}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const style = { "--progress": `${Math.max(0, Math.min(100, value))}%` } as CSSProperties;
  return (
    <div
      className={cn("progress-track", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={`${value}% complete`}
    >
      <motion.div
        className="progress-fill"
        style={style}
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
