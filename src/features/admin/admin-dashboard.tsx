"use client";

import { useState } from "react";
import {
  Bell,
  CalendarDays,
  FileText,
  BookOpen,
  GraduationCap,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NoticesAdmin } from "@/features/admin/notices-admin";
import { CalendarAdmin } from "@/features/admin/calendar-admin";
import { PapersAdmin } from "@/features/admin/papers-admin";
import { SyllabusAdmin } from "@/features/admin/syllabus-admin";
import { TimetablesAdmin } from "@/features/admin/timetables-admin";

type TabKey = "notices" | "calendar" | "papers" | "syllabus" | "timetables";

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: Tab[] = [
  { key: "notices", label: "Notices", icon: Bell },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "papers", label: "Papers", icon: FileText },
  { key: "syllabus", label: "Syllabus", icon: BookOpen },
  { key: "timetables", label: "Timetables", icon: GraduationCap },
];

/**
 * AdminDashboard — top-level shell for the admin panel.
 *
 * Renders the page header (logo, title, logout) and a simple button-based
 * tab strip. We deliberately avoid Radix Tabs here in favour of plain
 * buttons — fewer moving parts in the admin shell, no focus-trap quirks
 * with the inner forms, and the active tab is just useState.
 */
export function AdminDashboard({
  adminKey,
  onLogout,
}: {
  adminKey: string;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("notices");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold">KTU One Admin</div>
              <div className="text-xs text-muted-foreground">
                Content management console
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            aria-label="Logout"
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Tab strip */}
      <nav
        className="sticky top-[57px] z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        aria-label="Admin sections"
      >
        <div className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-2 py-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Active panel */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {tab === "notices" && <NoticesAdmin adminKey={adminKey} />}
        {tab === "calendar" && <CalendarAdmin adminKey={adminKey} />}
        {tab === "papers" && <PapersAdmin adminKey={adminKey} />}
        {tab === "syllabus" && <SyllabusAdmin adminKey={adminKey} />}
        {tab === "timetables" && <TimetablesAdmin adminKey={adminKey} />}
      </main>

      <footer className="mt-auto border-t border-border bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 text-center text-xs text-muted-foreground">
          KTU One Admin · Bearer-key authenticated · All mutations are audited
        </div>
      </footer>
    </div>
  );
}
