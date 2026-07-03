"use client";

import { useState, useEffect } from "react";
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

const eventTypeLabel: Record<CalendarEventType, string> = {
  EXAM: "Exam",
  HOLIDAY: "Holiday",
  RESULT: "Result",
  REGISTRATION: "Registration",
  WORKSHOP: "Workshop",
  DEADLINE: "Deadline",
  EVENT: "Event",
};

export function Calendar() {
  const [tab, setTab] = useState<"events" | "timetable">("events");
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div>
        <div className="section-eyebrow">Planner</div>
        <h1 className="section-title text-[30px] mt-1">Academic calendar</h1>
        <p className="text-[13.5px] mt-2 max-w-lg text-muted-foreground">
          Exams, deadlines, holidays and your exam timetable.
        </p>
      </div>

      {/* ===== TAB SWITCHER ===== */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("events")}
          className={cn(
            "pb-2 pr-4 text-[13.5px] font-medium border-b-2 -mb-px transition-colors",
            tab === "events"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <CalendarDays className="size-3.5 inline mr-1.5" />
          Academic Calendar
        </button>
        <button
          onClick={() => setTab("timetable")}
          className={cn(
            "pb-2 px-4 text-[13.5px] font-medium border-b-2 -mb-px transition-colors",
            tab === "timetable"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <GraduationCap className="size-3.5 inline mr-1.5" />
          Exam Timetable
        </button>
      </div>

      {/* ===== TAB CONTENT ===== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={mounted && !prefersReduced ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          {tab === "events" ? <EventsTab /> : <TimetableTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ====================================================================== */
/* TAB 1 — Academic Calendar events                                       */
/* ====================================================================== */

function EventsTab() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar"],
    queryFn: () => getCalendarEvents(),
    staleTime: 5 * 60 * 1000,
  });

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  const now = Date.now();

  return (
    <div>
      {isLoading ? (
        <div className="card p-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-4 border-t border-border">
              <div className="h-4 w-2/3 shimmer rounded mb-2" />
              <div className="h-3 w-1/3 shimmer rounded" />
            </div>
          ))}
        </div>
      ) : sortedEvents.length === 0 ? (
        <EmptyState
          title="No calendar events"
          description="Check back later for exams, holidays and academic deadlines."
          illustration={<SketchNotebook size={96} color="lavender" />}
        />
      ) : (
        <div className="card p-2">
          {sortedEvents.map((e, i) => {
            const startDate = new Date(e.startDate);
            const endDate = new Date(e.endDate);
            const isMultiDay = startDate.toDateString() !== endDate.toDateString();
            const daysUntil = Math.ceil(
              (startDate.getTime() - now) / (1000 * 60 * 60 * 24),
            );
            const isPast = endDate.getTime() < now;
            const isDeadline = e.type === "DEADLINE" || e.type === "EXAM";

            return (
              <motion.div
                key={e.id}
                initial={mounted && !prefersReduced ? { opacity: 0, y: 4 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.25 }}
                className="px-4 py-4 border-t border-border card-hover rounded-md first:border-t-0 relative"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
                  style={{ background: e.color }}
                />
                <div className="flex items-start gap-4 pl-2">
                  {/* Date block */}
                  <div className="text-center shrink-0 min-w-[56px]">
                    <div className="text-[10px] font-mono uppercase tracking-wide text-[color:var(--text-faint)]">
                      {startDate.toLocaleString("en-IN", { month: "short" })}
                    </div>
                    <div className="text-2xl font-semibold leading-none mt-0.5 section-title">
                      {startDate.getDate()}
                    </div>
                    {isMultiDay && (
                      <div className="text-[10px] font-mono mt-1 text-[color:var(--text-faint)]">
                        → {endDate.getDate()}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="text-[13.5px] font-medium">{e.title}</h3>
                      <span className="tag">{eventTypeLabel[e.type]}</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-1">{e.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11.5px] font-mono text-[color:var(--text-faint)] flex-wrap">
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
                      {isPast ? (
                        <span className="ml-auto tag">Past</span>
                      ) : daysUntil > 0 ? (
                        <span className={cn("ml-auto tag", isDeadline && "tag-brick")}>
                          in {daysUntil} day{daysUntil !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="ml-auto tag tag-brick">Today</span>
                      )}
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
/* TAB 2 — Exam Timetable                                                 */
/* ====================================================================== */

function TimetableTab() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);
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
        illustration={<LogIn className="size-12 text-muted-foreground/40" />}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="card p-2">
        <div className="px-4 py-6 border-t border-border">
          <div className="h-5 w-1/2 shimmer rounded mb-3" />
          <div className="h-4 w-1/3 shimmer rounded" />
        </div>
      </div>
    );
  }

  if (!timetable) {
    return (
      <EmptyState
        title="No active timetable"
        description="There's no active exam timetable for your branch and semester yet. Check back once your batch's schedule is published."
        illustration={<SketchNotebook size={96} color="plum" />}
      />
    );
  }

  const updatedDate = new Date(timetable.updatedAt);

  return (
    <motion.div
      initial={mounted && !prefersReduced ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="card p-5 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
        <div className="flex items-start gap-4 pl-2">
          <div className="text-center shrink-0 min-w-[56px]">
            <div className="text-[10px] font-mono uppercase tracking-wide text-[color:var(--text-faint)]">
              {updatedDate.toLocaleString("en-IN", { month: "short" })}
            </div>
            <div className="text-2xl font-semibold leading-none mt-0.5 section-title">
              {updatedDate.getDate()}
            </div>
            <div className="text-[10px] font-mono mt-1 text-[color:var(--text-faint)]">
              {updatedDate.getFullYear()}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="section-title text-lg">{timetable.title}</h3>
              <span className="tag tag-amber">Active</span>
            </div>
            <p className="text-[13px] text-muted-foreground mt-1">
              Exam timetable for semester{" "}
              <span className="font-medium text-foreground">S{timetable.semester}</span>{" "}
              · branch{" "}
              <span className="font-medium text-foreground">{timetable.branchCode}</span>
            </p>
            <div className="flex items-center gap-3 mt-2 text-[11.5px] font-mono text-[color:var(--text-faint)] flex-wrap">
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
