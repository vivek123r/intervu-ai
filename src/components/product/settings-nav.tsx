"use client";

import { Bell, Bot, CalendarDays, LockKeyhole, Palette, Settings2, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

import styles from "@/app/(product)/product.module.css";

const items = [
  { label: "Preferences", href: "/settings", icon: Settings2 },
  { label: "AI preferences", href: "/settings#ai", icon: Bot },
  { label: "Interview", href: "/settings#interview", icon: UserRound },
  { label: "Integrations", href: "/settings/integrations", icon: CalendarDays },
  { label: "Notifications", href: "/settings#notifications", icon: Bell },
  { label: "Appearance", href: "/settings#appearance", icon: Palette },
  { label: "Privacy", href: "/settings#privacy", icon: LockKeyhole },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.settingsNav} aria-label="Settings sections">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/settings/integrations" ? pathname === item.href : pathname === "/settings" && item.href === "/settings";
        return <Link key={item.label} href={item.href} className={cn(active && styles.settingsNavActive)}><Icon size={16} /><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}
