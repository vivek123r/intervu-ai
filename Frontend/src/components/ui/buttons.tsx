import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Variant = "gold" | "ghost" | "quiet";

interface SharedProps {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  href?: string;
  ariaLabel?: string;
  signalAnchor?: string;
  signalLabel?: string;
  signalOrder?: number;
}

type ActionButtonProps = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function ActionButton({
  children,
  className,
  variant = "gold",
  href,
  ariaLabel,
  signalAnchor,
  signalLabel,
  signalOrder,
  ...props
}: ActionButtonProps) {
  const classes = cn(
    variant === "gold" && "gold-button",
    variant === "ghost" && "ghost-button",
    variant === "quiet" && "quiet-button",
    className,
  );
  const signalAttributes = signalAnchor
    ? {
        "data-signal-anchor": signalAnchor,
        ...(signalLabel ? { "data-signal-label": signalLabel } : {}),
        ...(signalOrder !== undefined
          ? { "data-signal-order": signalOrder }
          : {}),
      }
    : {};

  if (href) {
    return (
      <Link
        className={classes}
        href={href}
        aria-label={ariaLabel}
        {...signalAttributes}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      aria-label={ariaLabel}
      {...props}
      {...signalAttributes}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  className,
  ariaLabel,
  ...props
}: Omit<ActionButtonProps, "variant" | "href"> & { ariaLabel: string }) {
  return (
    <button
      className={cn("icon-button", className)}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  );
}
