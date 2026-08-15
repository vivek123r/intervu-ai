"use client";

import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  Home,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { CommandPalette, useCommandShortcut } from "@/components/shell/command-palette";
import { Brand } from "@/components/ui/brand";
import { IconButton } from "@/components/ui/buttons";
import { cn } from "@/lib/cn";
import { useProduct } from "@/lib/product-store";

const primaryNav = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Interviews", href: "/interviews", icon: CalendarDays },
  { label: "Practice", href: "/practice", icon: Sparkles },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

const mobileNav = [...primaryNav, { label: "Settings", href: "/settings", icon: Settings }];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, markNotificationsRead } = useProduct();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  useCommandShortcut(() => setPaletteOpen(true));

  const isImmersive = pathname.endsWith("/mock") || pathname === "/practice/session";
  const unread = state.notifications.filter((item) => !item.read).length;

  if (isImmersive) {
    return (
      <>
        <a className="skip-link" href="#main-content">
          Skip to interview
        </a>
        {children}
      </>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <Brand />
        <nav className="app-primary-nav" aria-label="Application navigation">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              className={cn("app-nav-link", isActive(pathname, item.href) && "is-active")}
              href={item.href}
            >
              {item.label}
              {isActive(pathname, item.href) && <motion.span layoutId="app-nav-indicator" />}
            </Link>
          ))}
        </nav>
        <div className="app-header-actions">
          <button className="search-trigger" onClick={() => setPaletteOpen(true)}>
            <Search size={16} />
            <span>Search</span>
            <kbd>⌘K</kbd>
          </button>
          <div className="notification-anchor">
            <IconButton
              ariaLabel={`${unread} unread notifications`}
              onClick={() => {
                setNotificationsOpen((open) => !open);
                if (!notificationsOpen) markNotificationsRead();
              }}
            >
              <Bell size={18} />
              {unread > 0 && <span className="notification-count">{unread}</span>}
            </IconButton>
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  className="notification-popover surface gold-surface"
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.985 }}
                >
                  <div className="popover-heading">
                    <strong>Signals</strong>
                    <IconButton ariaLabel="Close notifications" onClick={() => setNotificationsOpen(false)}>
                      <X size={16} />
                    </IconButton>
                  </div>
                  {state.notifications.map((item) => (
                    <Link key={item.id} href={item.actionHref ?? "/dashboard"} className="notification-row">
                      <span className="status-dot" />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.message}</small>
                      </span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Link className="profile-trigger" href="/profile" aria-label="Open profile">
            <span className="profile-avatar">AM</span>
            <span className="profile-copy">
              <strong>Alex</strong>
              <small>Candidate</small>
            </span>
            <ChevronDown size={14} />
          </Link>
        </div>
      </header>

      <main id="main-content" className="app-main">
        {children}
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("mobile-nav-link", isActive(pathname, item.href) && "is-active")}
            >
              <Icon size={20} />
              <span>{item.label}</span>
              {isActive(pathname, item.href) && <motion.i layoutId="mobile-nav-indicator" />}
            </Link>
          );
        })}
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
