"use client";

/* Firebase profile photos can come from several Google-managed hosts. */
/* eslint-disable @next/next/no-img-element */

import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  Search,
  Settings,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { CommandPalette, useCommandShortcut } from "@/components/shell/command-palette";
import { Brand } from "@/components/ui/brand";
import { IconButton } from "@/components/ui/buttons";
import { cn } from "@/lib/cn";
import { useProduct } from "@/lib/product-store";
import { useGetNotificationsQuery, useMarkNotificationReadMutation } from "@/services/api/system.api";

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
  const router = useRouter();
  const { state, signOut } = useProduct();
  const { data: notifications = [] } = useGetNotificationsQuery();
  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  useCommandShortcut(() => setPaletteOpen(true));

  useEffect(() => {
    if (!profileMenuOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileMenuOpen]);

  const isImmersive = pathname.endsWith("/mock") || pathname === "/practice/session";
  const unread = notifications.filter((item) => !item.read).length;
  const firstName = state.userName.trim().split(/\s+/)[0] || "Candidate";
  const initials = state.userName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "C";

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      setProfileMenuOpen(false);
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  };

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
                if (!notificationsOpen) {
                  notifications
                    .filter((item) => !item.read)
                    .forEach((item) => void markNotificationRead(item.id));
                }
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
                  {notifications.map((item) => (
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
          <div className="profile-menu-anchor" ref={profileMenuRef}>
            <button
              type="button"
              className="profile-trigger"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              aria-controls="profile-menu"
              onClick={() => setProfileMenuOpen((open) => !open)}
            >
              <span className="profile-avatar">
                {state.userPhotoUrl ? <img src={state.userPhotoUrl} alt="" /> : initials}
              </span>
              <span className="profile-copy">
                <strong>{firstName}</strong>
                <small>{state.userEmail ?? "Google account"}</small>
              </span>
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            <AnimatePresence>
              {profileMenuOpen && (
                <motion.div
                  id="profile-menu"
                  className="profile-menu surface"
                  role="menu"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <div className="profile-menu-heading">
                    <span className="profile-menu-avatar">
                      {state.userPhotoUrl ? <img src={state.userPhotoUrl} alt="" /> : initials}
                    </span>
                    <span className="profile-menu-identity-copy">
                      <strong>{state.userName || "Candidate"}</strong>
                      <small>{state.userEmail ?? "Google account"}</small>
                    </span>
                  </div>
                  <div className="profile-menu-divider" />
                  <Link
                    href="/profile"
                    className="profile-menu-item profile-menu-profile"
                    role="menuitem"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <span className="profile-menu-item-icon"><UserRound size={15} /></span>
                    <span className="profile-menu-item-copy">
                      <strong>Profile</strong>
                      <small>Manage your interview context</small>
                    </span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </Link>
                  <div className="profile-menu-divider" />
                  <button
                    type="button"
                    className="profile-menu-item profile-menu-signout"
                    role="menuitem"
                    onClick={() => void handleSignOut()}
                    disabled={loggingOut}
                  >
                    <span className="profile-menu-item-icon"><LogOut size={15} /></span>
                    <span className="profile-menu-item-copy">
                      <strong>{loggingOut ? "Signing out…" : "Sign out"}</strong>
                      <small>End this session</small>
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
