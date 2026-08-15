import Link from "next/link";

import { cn } from "@/lib/cn";

export function Brand({
  compact = false,
  className,
  signalOrigin = false,
}: {
  compact?: boolean;
  className?: string;
  signalOrigin?: boolean;
}) {
  return (
    <Link className={cn("brand", className)} href="/" aria-label="Intervu AI home">
      <span
        className="brand-mark"
        aria-hidden="true"
        data-signal-anchor={signalOrigin ? "origin" : undefined}
        data-signal-label={signalOrigin ? "SIGNAL ONLINE" : undefined}
        data-signal-order={signalOrigin ? "0" : undefined}
      >
        <svg viewBox="0 0 24 24" role="img">
          <path d="M5.5 7.5 12 3.8l6.5 3.7v9L12 20.2l-6.5-3.7Z" />
          <path d="M8.8 9.2v5.6M12 7.4v9.2M15.2 9.2v5.6" />
        </svg>
      </span>
      {!compact && (
        <span className="brand-name">
          INTERVU <span>AI</span>
        </span>
      )}
    </Link>
  );
}
