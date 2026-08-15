"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ActionButton } from "@/components/ui/buttons";
import { Brand } from "@/components/ui/brand";

const items = [
  { label: "Product", href: "/#product" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Analysis", href: "/#analysis" },
  { label: "Practice", href: "/practice" },
];

export function MarketingNav() {
  const pathname = usePathname();
  return (
    <header className="marketing-nav-wrap">
      <nav className="marketing-nav" aria-label="Primary navigation">
        <Brand />
        <div className="marketing-nav-links">
          {items.map((item) => (
            <Link key={item.label} href={item.href} className="marketing-nav-link">
              {item.label}
              {pathname === item.href && <motion.span layoutId="marketing-active" />}
            </Link>
          ))}
        </div>
        <ActionButton href="/login" className="nav-cta">
          Get started <ArrowUpRight data-arrow size={16} />
        </ActionButton>
      </nav>
    </header>
  );
}
