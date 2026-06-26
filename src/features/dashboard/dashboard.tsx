"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Trophy,
  Award,
  CalendarCheck,
  ClipboardList,
  Target,
  FileText,
  BookOpen,
  Bell,
  CalendarDays,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  ChevronRight,
} from "lucide-react";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { GradientCard } from "@/components/ui-custom/gradient-card";
import { StatCard } from "@/components/ui-custom/stat-card";
import { AnimatedCounter } from "@/components/ui-custom/animated-counter";
import { CircularProgress } from "@/components/ui-custom/circular-progress";
import { BannerAd } from "@/components/ui-custom/banner-ad";
import { Mascot } from "@/components/brand/mascot";
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
  MOCK_PAPERS,
  MOCK_NOTICES,
  MOCK_CALENDAR,
  MOCK_HISTORY,
  MOCK_STUDENT,
} from "@/data/mock-data";
import { formatRelativeTime, formatNumber } from "@/lib/utils/calc";

const calcIcons: Record<CalculatorKey, React.ComponentType<{ className?: string }>> = {
  sgpa: Trophy,
  cgpa: Award,
  attendance: CalendarCheck,
  internal: ClipboardList,
  pass: Target,
};

const accentMap: Record<string, "plum" | "amber" | "mint" | "coral"> = {
  plum: "plum",
  amber: "amber",
  mint: "mint",
  coral: "coral",
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

  const firstName = (profile?.name ?? MOCK_STUDENT.name).split(" ")[0]!;
  const upcomingEvent = MOCK_CALENDAR[0]!;

  const recentPapers = MOCK_PAPERS.slice(0, 4);
  const recentNotices = MOCK_NOTICES.slice(0, 3);
  const recentHistory = MOCK_HISTORY.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Hero welcome */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GradientCard className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm opacity-80 font-medium">
                {greeting}, {firstName} 👋
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-1">
                Your academic day, sorted.
              </h1>
              <p className="mt-2 text-sm opacity-90 max-w-md">
                {profile
                  ? `${profile.branchName} · Semester ${profile.semester}`
                  : "Sign in to see your CGPA, attendance and results."}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-5">
                <button
                  onClick={() => set("calculators")}
                  className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-sm font-medium transition flex items-center gap-2"
                >
                  <Sparkles className="size-4" />
                  Open a calculator
                </button>
                {!isSupporter && (
                  <button
                    onClick={() => setSupportOpen(true)}
                    className="px-4 py-2 rounded-full bg-white text-primary text-sm font-semibold hover:bg-white/90 transition"
                  >
                    Go ad-free · ₹99
                  </button>
                )}
              </div>
            </div>
            <div className="hidden sm:block">
              <Mascot size={120} mood="wave" />
            </div>
          </div>
        </GradientCard>
      </motion.div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current CGPA"
          value={
            <AnimatedCounter value={8.31} decimals={2} />
          }
          icon={<TrendingUp className="size-5" />}
          accent="plum"
          hint="Across 2 semesters"
        />
        <StatCard
          label="Attendance"
          value={
            <span>
              <AnimatedCounter value={78.2} decimals={1} />%
            </span>
          }
          icon={<CalendarCheck className="size-5" />}
          accent="amber"
          hint="2 subjects at risk"
        />
        <StatCard
          label="Papers"
          value={<AnimatedCounter value={1280} />}
          icon={<FileText className="size-5" />}
          accent="mint"
          hint="Available to download"
        />
        <StatCard
          label="Notices"
          value={
            <span>
              <AnimatedCounter value={6} />
            </span>
          }
          icon={<Bell className="size-5" />}
          accent="coral"
          hint="2 unread this week"
        />
      </div>

      {/* Quick actions — calculator shortcuts */}
      <section>
        <SectionHeader
          title="Quick actions"
          subtitle="Jump straight into a calculator"
          onSeeAll={() => set("calculators" as NavKey)}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {CALCULATORS.map((calc, i) => {
            const Icon = calcIcons[calc.key];
            return (
              <motion.button
                key={calc.key}
                initial={prefersReduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
                onClick={() => set("calculators")}
                className="glass rounded-2xl p-4 text-left hover:shadow-elevated hover:-translate-y-0.5 transition-all group"
              >
                <div
                  className={`size-10 rounded-xl flex items-center justify-center mb-3 ${
                    calc.accent === "plum"
                      ? "bg-primary/10 text-primary"
                      : calc.accent === "amber"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : calc.accent === "mint"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  <Icon className="size-5" />
                </div>
                <p className="text-sm font-semibold leading-tight">{calc.title.replace(" Calculator", "")}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {calc.description}
                </p>
                <div className="mt-2 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition">
                  Open <ArrowRight className="size-3" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Ad */}
      <BannerAd slot="home-top" />

      {/* Two-column section: recent activity + upcoming */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent calculations */}
        <GlassCard className="lg:col-span-2 p-5">
          <SectionHeader
            title="Recent activity"
            subtitle="What you calculated recently"
            compact
          />
          <div className="space-y-2">
            {recentHistory.map((h) => (
              <button
                key={h.id}
                onClick={() => set("calculators")}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-secondary/60 transition text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {h.type === "SGPA" && <Trophy className="size-4" />}
                    {h.type === "CGPA" && <Award className="size-4" />}
                    {h.type === "ATTENDANCE" && <CalendarCheck className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {h.label ?? h.type}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatRelativeTime(h.output.computedAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold tabular-nums">
                    {h.output.value.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {h.type}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Attendance gauge */}
        <GlassCard className="p-5">
          <SectionHeader title="Attendance" subtitle="This semester" compact />
          <div className="flex flex-col items-center justify-center py-4">
            <CircularProgress
              value={78.2}
              size={140}
              label={
                <span className="text-3xl font-bold">
                  <AnimatedCounter value={78.2} decimals={1} />%
                </span>
              }
              sublabel="Overall"
              color="var(--warning)"
            />
            <p className="mt-4 text-xs text-muted-foreground text-center">
              <span className="text-destructive font-medium">2 subjects</span> below 75% threshold
            </p>
            <button
              onClick={() => set("calculators")}
              className="mt-3 text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              Check required classes <ChevronRight className="size-3" />
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Notices */}
      <section>
        <SectionHeader
          title="Latest notices"
          subtitle="From the university"
          onSeeAll={() => set("notices" as NavKey)}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recentNotices.map((n) => (
            <GlassCard
              key={n.id}
              hover
              className="p-4 cursor-pointer"
              onClick={() => set("notices" as NavKey)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-widest text-primary font-semibold px-2 py-0.5 rounded-full bg-primary/10">
                  {n.category}
                </span>
                {n.pinned && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                    Pinned
                  </span>
                )}
              </div>
              <p className="text-sm font-medium leading-snug line-clamp-2">
                {n.title}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {formatRelativeTime(n.publishedAt)}
              </p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Upcoming + Continue Reading */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Upcoming academic event */}
        <GlassCard className="p-5">
          <SectionHeader title="Upcoming" subtitle="Next on your calendar" compact />
          <div className="flex items-start gap-4 p-3 rounded-xl bg-secondary/40">
            <div className="text-center shrink-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                {new Date(upcomingEvent.startDate).toLocaleString("en-IN", { month: "short" })}
              </p>
              <p className="text-2xl font-bold text-primary">
                {new Date(upcomingEvent.startDate).getDate()}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{upcomingEvent.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {upcomingEvent.description}
              </p>
              <button
                onClick={() => set("calendar" as NavKey)}
                className="mt-2 text-xs text-primary hover:underline font-medium flex items-center gap-1"
              >
                View calendar <ChevronRight className="size-3" />
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Continue reading */}
        <GlassCard className="p-5">
          <SectionHeader
            title="Continue reading"
            subtitle="Recently viewed papers"
            onSeeAll={() => set("papers" as NavKey)}
            compact
          />
          <div className="space-y-2">
            {recentPapers.slice(0, 3).map((p) => (
              <button
                key={p.id}
                onClick={() => set("papers" as NavKey)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition text-left"
              >
                <div className="size-9 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.subjectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.examType.replace("_", " ")} · {p.year} · {formatNumber(p.views)} views
                  </p>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Support banner — for non-supporters */}
      {!isSupporter && (
        <GradientCard gradient="warm" className="p-6">
          <div className="flex items-center gap-5 flex-wrap">
            <Mascot size={72} mood="happy" />
            <div className="flex-1 min-w-[200px]">
              <h3 className="text-xl font-bold">Love KTU One?</h3>
              <p className="text-sm opacity-90 mt-1">
                Support development for ₹99 lifetime. Remove ads, get a badge, and
                help every KTU student.
              </p>
            </div>
            <button
              onClick={() => setSupportOpen(true)}
              className="px-5 py-2.5 rounded-full bg-white text-primary font-semibold hover:bg-white/90 transition shadow-soft"
            >
              Become a Supporter
            </button>
          </div>
        </GradientCard>
      )}

      {/* Footer note */}
      <footer className="pt-6 pb-2 text-center">
        <p className="text-xs text-muted-foreground">
          {UNIVERSITY_NAME} · v{APP_VERSION} · Made with 💜 for KTU students
        </p>
      </footer>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  onSeeAll,
  compact,
}: {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-end justify-between gap-4 ${compact ? "mb-3" : "mb-4"}`}>
      <div>
        <h2 className={`font-bold tracking-tight ${compact ? "text-base" : "text-xl"}`}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="text-xs text-primary hover:underline font-medium flex items-center gap-1 shrink-0"
        >
          See all <ArrowRight className="size-3" />
        </button>
      )}
    </div>
  );
}
