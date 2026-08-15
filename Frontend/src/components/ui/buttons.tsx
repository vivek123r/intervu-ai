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
}

type ActionButtonProps = SharedProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function ActionButton({
  children,
  className,
  variant = "gold",
  href,
  ariaLabel,
  ...props
}: ActionButtonProps) {
  const classes = cn(
    variant === "gold" && "gold-button",
    variant === "ghost" && "ghost-button",
    variant === "quiet" && "quiet-button",
    className,
  );

  if (href) {
    return (
      <Link className={classes} href={href} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} aria-label={ariaLabel} {...props}>
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
    <button className={cn("icon-button", className)} aria-label={ariaLabel} {...props}>
      {children}
    </button>
  );
}
