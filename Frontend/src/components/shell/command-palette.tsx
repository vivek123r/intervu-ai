"use client";

import {
  BarChart3,
  CalendarDays,
  FileUp,
  History,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/ui/modal";

const commands = [
  { label: "Start mock interview", hint: "Practice", href: "/practice/setup", icon: Sparkles },
  { label: "Add interview", hint: "Interviews", href: "/interviews?add=true", icon: Plus },
  { label: "Sync calendar", hint: "Integrations", href: "/settings/integrations", icon: CalendarDays },
  { label: "Upload resume", hint: "Profile", href: "/profile", icon: FileUp },
  { label: "Open analytics", hint: "Performance", href: "/analytics", icon: BarChart3 },
  { label: "Open session history", hint: "History", href: "/history", icon: History },
  { label: "Open settings", hint: "Preferences", href: "/settings", icon: Settings },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(needle));
  }, [query]);

  return (
    <Modal open={open} onClose={onClose} title="Go anywhere" className="command-modal">
      <label className="command-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search commands</span>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search interviews, reports, or actions…"
        />
        <kbd>ESC</kbd>
      </label>
      <div className="command-results" role="listbox" aria-label="Commands">
        {results.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              role="option"
              aria-selected="false"
              onClick={() => {
                onClose();
                router.push(item.href);
              }}
            >
              <span className="command-icon">
                <Icon size={18} />
              </span>
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </button>
          );
        })}
        {!results.length && <p className="command-empty">No matching command.</p>}
      </div>
    </Modal>
  );
}

export function useCommandShortcut(onOpen: () => void) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onOpen]);
}
