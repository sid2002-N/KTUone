"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Award,
  CalendarCheck,
  ClipboardList,
  Target,
  FileText,
  Bell,
  Clock,
  ChevronRight,
  Heart,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useNavStore } from "@/store/nav-store";
import { useSupporterStore } from "@/store/supporter-store";
import { useAuthStore } from "@/store/auth-store";
import {
  CALCULATORS,
  APP_VERSION,
  UNIVERSITY_NAME,
  type NavKey,
  type CalculatorKey,
} from "@/lib/constants";
import {
  getDashboardStats,
  getRecentNotices,
  getUpcomingEvent,
  getRecentPapers,
} from "@/features/dashboard/actions";
import { getActiveTimetable } from "@/features/timetable/actions";
import { useCalcHistory } from "@/features/calculators/use-calc-history";
import { formatRelativeTime, formatNumber } from "@/lib/utils/calc";

const calcIcons: Record<CalculatorKey, React.ComponentType<{ className?: string }>> = {
  sgpa: Trophy,
  cgpa: Award,
  attendance: CalendarCheck,
  internal: ClipboardList,
  pass: Target,
};

export function Dashboard() {
  const set = useNavStore((s) => s.set);
  const setSupportOpen = useNavStore((s) => s.setSupportOpen);
  const isSupporter = useSupporterStore((s) => s.isSupporter);
  const profile = useAuthStore((s) => s.profile);
  const prefersReduced = useReducedMotion();

  const [greeting, setGreeting] = useState("Good morning");
  useEffect(() => {
    const h = new Date().getHours();
    const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    Promise.resolve().then(() => setGreeting(g));
  }, []);

  const firstName = (profile?.name ?? "Student").split(" ")[0]!;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);
  const setSyncOpen = useNavStore((s) => s.setSyncOpen);
  const setLoginOpen = useNavStore((s) => s.setLoginOpen);

  const isStale =
    isAuthenticated &&
    (!lastSyncedAt || Date.now() - new Date(lastSyncedAt).getTime() > 24 * 60 * 60 * 1000);

  const { data: stats } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => getDashboardStats(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: recentNotices = [] } = useQuery({
    queryKey: ["dashboard", "recent-notices"],
    queryFn: () => getRecentNotices(3),
    staleTime: 60 * 1000,
  });
  const { data: upcomingEvent } = useQuery({
    queryKey: ["dashboard", "upcoming"],
    queryFn: () => getUpcomingEvent(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: recentPapers = [] } = useQuery({
    queryKey: ["dashboard", "recent-papers"],
    queryFn: () => getRecentPapers(4),
    staleTime: 5 * 60 * 1000,
  });

  const { data: cgpaData } = useQuery({
    queryKey: ["cgpa"],
    queryFn: async () => {
      const res = await fetch("/api/v1/cgpa", { credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json();
      return data.cgpa as { cgpa: number; totalCredits: number; creditsEarned: number };
    },
    enabled: isAuthenticated,
    staleTime: 60 * 60 * 1000,
  });

  const { entries: calcHistory } = useCalcHistory();
  const recentHistory = calcHistory.slice(0, 3);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-7">
      {/* ===== HEADER — date + name + branch tag ===== */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="section-eyebrow">
            {today}
            {profile ? ` — S${profile.semester}` : ""}
          </div>
          <h1 className="section-title text-[28px] md:text-[32px] mt-2">
            {greeting}, {firstName}
          </h1>
        </div>
        {profile && (
          <span className="tag">
            B.Tech · {profile.branchCode} · {UNIVERSITY_NAME}
          </span>
        )}
      </div>

      {/* Stale data banner */}
      {isStale && (
        <div className="card p-4 flex items-center gap-3 flex-wrap border-l-2 border-l-primary">
          <Clock className="size-5 text-primary shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-medium">
              {!lastSyncedAt
                ? "Sync to see your latest CGPA and results"
                : `Data last synced ${formatRelativeTime(lastSyncedAt)}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Re-fetch fresh data from KTU.
            </p>
          </div>
          <button
            onClick={() => setSyncOpen(true)}
            className="btn-ghost px-4 py-2 rounded-md text-xs font-medium flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className="size-3.5" />
            Sync
          </button>
        </div>
      )}

      {/* ===== ACADEMIC LEDGER STRIP — signature element ===== */}
      <div className="card p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="section-eyebrow">Academic standing — as recorded</div>
          {isAuthenticated ? (
            <button
              onClick={() => setLoginOpen(true)}
              className="text-[12.5px] underline decoration-dotted text-muted-foreground hover:text-foreground"
            >
              View transcript
            </button>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="text-[12.5px] underline decoration-dotted text-muted-foreground hover:text-foreground"
            >
              Sign in to view
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {/* CGPA */}
          <div className="pr-4 md:pr-6">
            <div className="text-[11px] font-mono text-[color:var(--text-faint)]">CGPA</div>
            <div className="section-title text-[26px] mt-1">
              {isAuthenticated && cgpaData ? (
                cgpaData.cgpa.toFixed(2)
              ) : isAuthenticated ? (
                <span className="text-base text-muted-foreground">Loading…</span>
              ) : (
                <span className="text-base text-muted-foreground">—</span>
              )}
            </div>
            <div className="text-[11.5px] mt-0.5 text-muted-foreground">
              {isAuthenticated && cgpaData
                ? `${cgpaData.creditsEarned} credits earned`
                : "Sign in to view"}
            </div>
          </div>

          {/* Percentage */}
          <div className="pl-4 md:pl-6 pr-4 md:pr-6">
            <div className="text-[11px] font-mono text-[color:var(--text-faint)]">Percentage</div>
            <div className="section-title text-[26px] mt-1">
              {isAuthenticated && cgpaData ? (
                <>{(cgpaData.cgpa * 10).toFixed(1)}<span className="text-[15px] text-[color:var(--text-faint)]">%</span></>
              ) : isAuthenticated ? (
                <span className="text-base text-muted-foreground">Loading…</span>
              ) : (
                <span className="text-base text-muted-foreground">—</span>
              )}
            </div>
            <div className="text-[11.5px] mt-0.5 text-muted-foreground">out of 100</div>
          </div>

          {/* Credits */}
          <div className="pl-4 md:pl-6 pr-4 md:pr-6">
            <div className="text-[11px] font-mono text-[color:var(--text-faint)]">Credits</div>
            <div className="section-title text-[26px] mt-1">
              {isAuthenticated && cgpaData ? (
                <>{cgpaData.creditsEarned}<span className="text-[15px] text-[color:var(--text-faint)]">/160</span></>
              ) : (
                <span className="text-base text-muted-foreground">—</span>
              )}
            </div>
            <div className="text-[11.5px] mt-0.5 text-muted-foreground">
              {isAuthenticated && cgpaData
                ? `${Math.round((cgpaData.creditsEarned / 160) * 100)}% on track`
                : "Sign in to view"}
            </div>
          </div>

          {/* Papers available */}
          <div className="pl-4 md:pl-6">
            <div className="text-[11px] font-mono text-[color:var(--text-faint)]">Papers</div>
            <div className="section-title text-[26px] mt-1">
              {stats?.papers ?? 0}
            </div>
            <div className="text-[11.5px] mt-0.5 text-muted-foreground">available to download</div>
          </div>
        </div>
      </div>

      {/* ===== CALCULATORS — quick access grid ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title text-[19px]">Calculators</h2>
          <button
            onClick={() => set("calculators")}
            className="text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            See all →
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {CALCULATORS.map((calc) => {
            const Icon = calcIcons[calc.key];
            return (
              <button
                key={calc.key}
                onClick={() => set("calculators")}
                className="card card-hover p-4 text-left"
              >
                <div className="icon-box mb-3">
                  <Icon className="size-4" />
                </div>
                <div className="text-[13.5px] font-medium">
                  {calc.title.replace(" Calculator", "")}
                </div>
                <div className="text-[11.5px] mt-0.5 text-[color:var(--text-faint)]">
                  {calc.key === "sgpa" && "Per semester"}
                  {calc.key === "cgpa" && "All semesters"}
                  {calc.key === "attendance" && "Track & predict"}
                  {calc.key === "internal" && "Series + assign."}
                  {calc.key === "pass" && "End-sem needed"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== TWO COLUMN: recent activity + upcoming ===== */}
      <div className="grid md:grid-cols-5 gap-6">
        {/* Recent activity / calc history */}
        <div className="md:col-span-3 card p-5 md:p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="section-title text-[19px]">Recent activity</h2>
            {recentHistory.length > 0 && (
              <button
                onClick={() => set("calculators")}
                className="text-[12.5px] text-muted-foreground hover:text-foreground"
              >
                View all →
              </button>
            )}
          </div>
          {recentHistory.length === 0 ? (
            <div className="empty-state py-8">
              <p className="text-sm text-muted-foreground mb-3">
                No calculations yet.
              </p>
              <button
                onClick={() => set("calculators")}
                className="text-[12.5px] underline decoration-dotted text-muted-foreground hover:text-foreground"
              >
                Open a calculator
              </button>
            </div>
          ) : (
            <div className="mt-3">
              {recentHistory.map((h) => (
                <div key={h.id} className="ledger-row">
                  <div>
                    <div className="text-[13.5px]">{h.label ?? h.type}</div>
                    <div className="text-[11.5px] font-mono mt-0.5 text-[color:var(--text-faint)]">
                      {h.type} · {formatRelativeTime(h.output.computedAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[14px]">{h.output.value.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="md:col-span-2 card p-5 md:p-6 flex flex-col">
          <h2 className="section-title text-[19px] mb-4">Upcoming</h2>
          {upcomingEvent ? (
            <div className="flex-1">
              <div className="ledger-row">
                <div>
                  <div className="text-[13.5px]">{upcomingEvent.title}</div>
                  <div className="text-[11.5px] font-mono mt-0.5 text-[color:var(--text-faint)]">
                    {new Date(upcomingEvent.startDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <button
                  onClick={() => set("calendar")}
                  className="text-[12.5px] text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-start justify-center py-6">
              <div className="icon-box mb-3">
                <CalendarCheck className="size-4" />
              </div>
              <div className="text-[13.5px] mb-1">Nothing scheduled</div>
              <div className="text-[12px] mb-4 text-muted-foreground">
                Add your class timetable or exam dates to see them here.
              </div>
              <button
                onClick={() => set("calendar")}
                className="btn-ghost text-[12.5px] px-3.5 py-2 rounded-md"
              >
                Open calendar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== NOTICES + PAPERS — two column ===== */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent notices */}
        <div className="card p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title text-[19px]">Notices</h2>
            <button
              onClick={() => set("notices" as NavKey)}
              className="text-[12.5px] text-muted-foreground hover:text-foreground"
            >
              All →
            </button>
          </div>
          {recentNotices.length === 0 ? (
            <div className="empty-state py-6">
              <p className="text-sm text-muted-foreground">No notices yet.</p>
            </div>
          ) : (
            <div>
              {recentNotices.map((n) => (
                <div key={n.id} className="ledger-row">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {n.pinned && (
                        <span className="tag tag-amber">Pinned</span>
                      )}
                      <span className="tag">{n.category}</span>
                    </div>
                    <div className="text-[13.5px] line-clamp-1">{n.title}</div>
                    <div className="text-[11.5px] font-mono mt-0.5 text-[color:var(--text-faint)]">
                      {formatRelativeTime(n.publishedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent papers */}
        <div className="card p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title text-[19px]">Papers</h2>
            <button
              onClick={() => set("papers" as NavKey)}
              className="text-[12.5px] text-muted-foreground hover:text-foreground"
            >
              All →
            </button>
          </div>
          {recentPapers.length === 0 ? (
            <div className="empty-state py-6">
              <p className="text-sm text-muted-foreground">No papers yet.</p>
            </div>
          ) : (
            <div>
              {recentPapers.slice(0, 4).map((p) => (
                <div key={p.id} className="ledger-row">
                  <div className="min-w-0">
                    <div className="text-[13.5px] line-clamp-1">{p.subjectName}</div>
                    <div className="text-[11.5px] font-mono mt-0.5 text-[color:var(--text-faint)]">
                      {p.subjectCode} · S{p.semester} · {p.year}
                    </div>
                  </div>
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {formatNumber(p.views)} views
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== SUPPORT BANNER — non-supporters only ===== */}
      {!isSupporter && (
        <div className="card p-6 flex items-center gap-5 flex-wrap">
          <div className="icon-box shrink-0">
            <Heart className="size-4" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="section-title text-lg">Support KTU One</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Remove ads and help keep this free for every KTU student. ₹99 lifetime.
            </p>
          </div>
          <button
            onClick={() => setSupportOpen(true)}
            className="btn-primary px-5 py-2.5 rounded-md text-sm font-semibold shrink-0"
          >
            Become a Supporter
          </button>
        </div>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="pt-8 pb-2 border-t border-border">
        <div className="flex flex-col sm:flex-row justify-between gap-2 text-[11.5px] text-[color:var(--text-faint)]">
          <div>Built for KTU students · not affiliated with the university</div>
          <div className="font-mono">{UNIVERSITY_NAME} · v{APP_VERSION}</div>
        </div>
      </footer>
    </div>
  );
}
