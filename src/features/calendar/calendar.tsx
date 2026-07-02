"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Clock, Bell } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { Badge } from "@/components/ui/badge";
import { getCalendarEvents } from "@/features/calendar/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils/calc";
import type { CalendarEventType } from "@/lib/types";
import { cn } from "@/lib/utils";

const eventTypeMeta: Record<CalendarEventType, { label: string; bg: string }> = {
  EXAM: { label: "Exam", bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  HOLIDAY: { label: "Holiday", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  RESULT: { label: "Result", bg: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  REGISTRATION: { label: "Registration", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  WORKSHOP: { label: "Workshop", bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  DEADLINE: { label: "Deadline", bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  EVENT: { label: "Event", bg: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
};

export function Calendar() {
  const prefersReduced = useReducedMotion();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar"],
    queryFn: () => getCalendarEvents(),
    staleTime: 5 * 60 * 1000,
  });

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  return (
    <div>
      <PageHeader
        title="Academic Calendar"
        description="Stay on top of exams, deadlines, holidays and key academic events."
        icon={<CalendarDays className="size-5" />}
      />

      {/* Month blocks */}
      <div className="space-y-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))
          : sortedEvents.map((e, i) => {
          const meta = eventTypeMeta[e.type];
          const startDate = new Date(e.startDate);
          const endDate = new Date(e.endDate);
          const isMultiDay = startDate.toDateString() !== endDate.toDateString();
          const daysUntil = Math.ceil(
            (startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          );
          return (
            <motion.div
              key={e.id}
              initial={prefersReduced ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <GlassCard className="p-4 sm:p-5 relative overflow-hidden" hover>
                {/* Color stripe */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ background: e.color }}
                />
                <div className="flex items-start gap-4 pl-2">
                  <div className="text-center shrink-0 min-w-[64px]">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                      {startDate.toLocaleString("en-IN", { month: "short" })}
                    </p>
                    <p className="text-3xl font-bold leading-none mt-0.5">
                      {startDate.getDate()}
                    </p>
                    {isMultiDay && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        → {endDate.getDate()}
                      </p>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold">{e.title}</h3>
                      <Badge className={cn("text-[10px]", meta.bg)} variant="secondary">
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{e.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {isMultiDay
                          ? `${formatDate(e.startDate)} → ${formatDate(e.endDate)}`
                          : formatDate(e.startDate)}
                      </span>
                      {e.reminderEnabled && (
                        <span className="flex items-center gap-1 text-primary">
                          <Bell className="size-3" /> Reminder on
                        </span>
                      )}
                      {daysUntil > 0 && (
                        <span className="ml-auto px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          in {daysUntil} day{daysUntil !== 1 ? "s" : ""}
                        </span>
                      )}
                      {daysUntil === 0 && (
                        <span className="ml-auto px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium">
                          Today
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
