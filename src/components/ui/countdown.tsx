"use client";

import { useEffect, useMemo, useState } from "react";

interface CountdownValue {
  days: number;
  hours: number;
  minutes: number;
}

function getCountdown(target: string) {
  const delta = Math.max(0, new Date(target).getTime() - Date.now());
  const totalMinutes = Math.floor(delta / 60_000);
  return {
    days: Math.floor(totalMinutes / 1_440),
    hours: Math.floor((totalMinutes % 1_440) / 60),
    minutes: totalMinutes % 60,
  };
}

export function Countdown({ target, compact = false }: { target: string; compact?: boolean }) {
  const [value, setValue] = useState<CountdownValue | null>(null);

  useEffect(() => {
    const update = () => setValue(getCountdown(target));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [target]);

  const spoken = useMemo(
    () => value
      ? `${value.days} days, ${value.hours} hours, and ${value.minutes} minutes`
      : "Countdown loading",
    [value],
  );

  if (compact) {
    return (
      <time className="mono" dateTime={target} aria-label={spoken}>
        {value ? `${value.days}d ${value.hours}h` : "--d --h"}
      </time>
    );
  }

  return (
    <span className="countdown" aria-label={spoken}>
      <strong className="mono">{value?.days ?? "--"}</strong><small>days</small>
      <i />
      <strong className="mono">{value ? value.hours.toString().padStart(2, "0") : "--"}</strong><small>hours</small>
      <i />
      <strong className="mono">{value ? value.minutes.toString().padStart(2, "0") : "--"}</strong><small>min</small>
    </span>
  );
}
