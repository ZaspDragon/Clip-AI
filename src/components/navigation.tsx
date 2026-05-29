"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/campaigns", label: "Campaign Lab" },
  { href: "/campaigns/new", label: "Add Campaign" },
  { href: "/clips", label: "Clip Tracker" },
  { href: "/submissions", label: "Submission Prep" },
  { href: "/settings", label: "Settings" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {navItems.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "pill transition-transform hover:-translate-y-0.5",
              active &&
                "border-transparent bg-[var(--foreground)] text-white shadow-lg shadow-slate-900/10",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
