"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CalendarDays, Clock, Bell, GraduationCap, LogIn } from "lucide-react";
import { EmptyState } from "@/components/ui-custom/empty-state";
import { SketchNotebook } from "@/components/ui-custom/sketch-elements";
import { getCalendarEvents } from "@/features/calendar/actions";
import { getActiveTimetable, type Timetable } from "@/features/timetable/actions";
import { useAuthStore } from "@/store/auth-store";
import { formatDate } from "@/lib/utils/calc";
import type { CalendarEventType } from "@/lib/types";
import { cn } from "@/lib/utils";

const eventTypeMeta: Record<
  CalendarEventType,
  { label: string; badgeClass: string }
> = {
  EXAM: { label: "Exam", badgeClass: "cal-badge-exam" },
  HOLIDAY: { label: "Holiday", badgeClass: "cal-badge-holiday" },
  RESULT: { label: "Result", badgeClass: "cal-badge-result" },
  REGISTRATION: { label: "Registration", badgeClass: "cal-badge-registration" },
  WORKSHOP: { label: "Workshop", badgeClass: "cal-badge-workshop" },
  DEADLINE: { label: "Deadline", badgeClass: "cal-badge-deadline" },
  EVENT: { label: "Event", badgeClass: "cal-badge-event" },
};

export function Calendar() {
  const [tab, setTab] = useState<"events" | "timetable">("events");
  const prefersReduced = useReducedMotion();

  return (
    <div className="space-y-5">
      {/* ===== PREMIUM HERO ===== */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="calendar-hero p-6 sm:p-8"
      >
        <p className="hero-eyebrow text-lg sm:text-xl rotate-[-2deg] inline-block mb-1">
          Planner
        </p>
        <h1 className="hero-headline text-3xl sm:text-4xl lg:text-5xl">
          Academic <em>calendar.</em>
        </h1>
        <p className="text-sm text-[var(--luxury-text-muted)] max-w-md leading-relaxed mt-2">
          Stay on top of exams, deadlines, holidays, key academic events and your exam timetable.
        </p>
      </motion.div>

      {/* ===== PREMIUM TAB SWITCHER ===== */}
      <div className="cal-tab-switcher inline-flex gap-1">
        <button
          onClick={() => setTab("events")}
          className={cn("cal-tab px-4 py-2 text-sm font-medium flex items-center gap-1.5", tab === "events" && "active")}
        >
          <CalendarDays className="size-3.5" />
          Academic Calendar
        </button>
        <button
          onClick={() => setTab("timetable")}
          className={cn("cal-tab px-4 py-2 text-sm font-medium flex items-center gap-1.5", tab === "timetable" && "active")}
        >
          <GraduationCap className="size-3.5" />
          Exam Timetable
        </button>
      </div>

      {/* ===== TAB CONTENT ===== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          {tab === "events" ? <EventsTab /> : <TimetableTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ====================================================================== */
/* TAB 1 — Academic Calendar events (premium)                             */
/* ====================================================================== */

function EventsTab() {
  const prefersReduced = useReducedMotion();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar"],
    queryFn: () => getCalendarEvents(),
    staleTime: 5 * 60 * 1000,
  });

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  // Split into upcoming + past for the milestone strip
  const now = Date.now();
  const upcoming = sortedEvents.filter(
    (e) => new Date(e.startDate).getTime() >= now,
  );
  const past = sortedEvents.filter(
    (e) => new Date(e.endDate).getTime() < now,
  );

  return (
    <div className="space-y-5">
      {/* Upcoming milestones strip — premium */}
      {upcoming.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-2 px-1">
            Upcoming milestones
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {upcoming.slice(0, 5).map((e) => {
              const startDate = new Date(e.startDate);
              const daysUntil = Math.ceil(
                (startDate.getTime() - now) / (1000 * 60 * 60 * 24),
              );
              return (
                <div key={e.id} className="cal-milestone shrink-0 min-w-[120px]">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {startDate.toLocaleString("en-IN", { month: "short" })}
                  </p>
                  <p className="text-xl font-bold leading-none mt-0.5 text-foreground">
                    {startDate.getDate()}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                    {e.title}
                  </p>
                  <p className="text-[10px] text-primary font-semibold mt-1">
                    {daysUntil === 0 ? "Today" : `${daysUntil}d`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Events list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-luxury-paper h-28 shimmer-luxury" />
          ))}
        </div>
      ) : sortedEvents.length === 0 ? (
        <EmptyState
          title="No calendar events"
          description="Check back later for exams, holidays and academic deadlines."
          illustration={<SketchNotebook size={120} color="lavender" />}
        />
      ) : (
        <div className="space-y-3">
          {sortedEvents.map((e, i) => {
            const meta = eventTypeMeta[e.type];
            const startDate = new Date(e.startDate);
            const endDate = new Date(e.endDate);
            const isMultiDay =
              startDate.toDateString() !== endDate.toDateString();
            const daysUntil = Math.ceil(
              (startDate.getTime() - now) / (1000 * 60 * 60 * 24),
            );
            const isPast = endDate.getTime() < now;
            return (
              <motion.div
                key={e.id}
                initial={prefersReduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="cal-event-card p-4 sm:p-5 relative">
                  {/* Color stripe */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ background: e.color }}
                  />
                  <div className="flex items-start gap-4 pl-2">
                    {/* Date block */}
                    <div className="cal-date-block">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                        {startDate.toLocaleString("en-IN", { month: "short" })}
                      </p>
                      <p className="text-2xl font-bold leading-none mt-0.5 text-foreground">
                        {startDate.getDate()}
                      </p>
                      {isMultiDay && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          → {endDate.getDate()}
                        </p>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">
                          {e.title}
                        </h3>
                        <span className={cn("cal-badge-type", meta.badgeClass)}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {e.description}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {isMultiDay
                            ? `${formatDate(e.startDate)} → ${formatDate(e.endDate)}`
                            : formatDate(e.startDate)}
                        </span>
                        {e.reminderEnabled && (
                          <span className="flex items-center gap-1 text-primary">
                            <Bell className="size-3" /> Reminder
                          </span>
                        )}
                        {/* Countdown */}
                        {isPast ? (
                          <span className="cal-countdown-past ml-auto">Past</span>
                        ) : daysUntil > 0 ? (
                          <span className="cal-countdown ml-auto">
                            in {daysUntil} day{daysUntil !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="cal-countdown-today ml-auto">Today</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ====================================================================== */
/* TAB 2 — Exam Timetable (premium)                                       */
/* ====================================================================== */

function TimetableTab() {
  const prefersReduced = useReducedMotion();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const profile = useAuthStore((s) => s.profile);

  const { data: timetable, isLoading } = useQuery<Timetable | null>({
    queryKey: ["timetable", profile?.semester, profile?.branchCode],
    queryFn: () => getActiveTimetable(profile!.semester, profile!.branchCode),
    enabled:
      isAuthenticated && !!profile && !!profile.semester && !!profile.branchCode,
    staleTime: 5 * 60 * 1000,
  });

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Log in to see your timetable"
        description="Sign in with your KTU register number to view the exam timetable for your branch and semester."
        illustration={<LogIn className="size-16 text-muted-foreground/60" />}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="skeleton-luxury-paper h-32 shimmer-luxury" />
      </div>
    );
  }

  if (!timetable) {
    return (
      <EmptyState
        title="No active timetable"
        description="There's no active exam timetable for your branch and semester yet. Check back once your batch's schedule is published."
        illustration={<SketchNotebook size={120} color="plum" />}
      />
    );
  }

  const updatedDate = new Date(timetable.updatedAt);

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="cal-timetable-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Date block */}
          <div className="cal-date-block">
            <p className="text-[10px] uppercase tracking-widest text-[var(--luxury-text-muted)] font-semibold">
              {updatedDate.toLocaleString("en-IN", { month: "short" })}
            </p>
            <p className="text-2xl font-bold leading-none mt-0.5 text-[var(--luxury-cream)]">
              {updatedDate.getDate()}
            </p>
            <p className="text-[10px] text-[var(--luxury-text-muted)] mt-1">
              {updatedDate.getFullYear()}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="font-serif text-lg text-[var(--luxury-cream)]">
                {timetable.title}
              </h3>
              <span className="cal-badge-type cal-badge-exam">Active</span>
            </div>
            <p className="text-sm text-[var(--luxury-text-muted)] mt-1 leading-relaxed">
              Exam timetable for semester{" "}
              <span className="font-medium text-[var(--luxury-cream)]">
                S{timetable.semester}
              </span>{" "}
              · branch{" "}
              <span className="font-medium text-[var(--luxury-cream)]">
                {timetable.branchCode}
              </span>
            </p>
            <div className="flex items-center gap-3 mt-3 text-xs text-[var(--luxury-text-muted)] flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                Updated {formatDate(timetable.updatedAt)}
              </span>
              {profile?.branchName && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="size-3" />
                  {profile.branchName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
