"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Flame,
  GraduationCap,
  ListChecks,
  Sun,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const navItems = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/assignments", label: "Assignments", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/grades", label: "Grades", icon: GraduationCap },
  { href: "/habits", label: "Habits", icon: Flame },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// Desktop: fixed sidebar on the left (md and up)
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2 px-5 font-heading font-semibold">
        <BookOpen className="size-5 text-primary" />
        Student Dashboard
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn("size-4", active && "text-primary")} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

// Phone: tab bar fixed to the bottom (below md)
export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground",
              active && "text-primary"
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
