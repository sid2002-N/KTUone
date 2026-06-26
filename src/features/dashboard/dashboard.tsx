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
  Heart,
} from "lucide-react";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { GradientCard } from "@/components/ui-custom/gradient-card";
import { StatCard } from "@/components/ui-custom/stat-card";
import { AnimatedCounter } from "@/components/ui-custom/animated-counter";
import { CircularProgress } from "@/components/ui-custom/circular-progress";
import { BannerAd } from "@/components/ui-custom/banner-ad";
import { HandwrittenText } from "@/components/ui-custom/handwritten-text";
import {
  SketchArrow,
  SketchStar,
  SketchDotTrail,
  SketchPaperPlane,
  SketchHeart,
  SketchCoffeeCup,
  SketchBooks,
  SketchPencil,
  SketchNotebook,
  FloatingParticles,
} from "@/components/ui-custom/sketch-elements";
import { CardDecoration, NotebookHeader, StickyNote } from "@/components/ui-custom/card-decoration";
import { EditorialDivider } from "@/components/ui-custom/editorial-divider";
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
      {/* Hero — notebook cover with embossed title, integrated study scene */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GradientCard gradient="plum" float className="p-7 sm:p-12 relative overflow-hidden">
          {/* Floating particles inside hero */}
          <FloatingParticles count={8} />

          {/* Study desk illustrations cluster — top right, integrated (not floating) */}
          <motion.div
            className="absolute top-8 right-8 hidden lg:flex items-end gap-1 pointer-events-none opacity-90"
            initial={prefersReduced ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 0.9, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <SketchBooks size={56} color="amber" />
            <div className="-ml-2 -mb-1">
              <SketchCoffeeCup size={36} color="coral" />
            </div>
            <div className="-ml-1 -mb-2">
              <SketchPencil size={28} color="amber" />
            </div>
          </motion.div>

          {/* Floating paper plane — feels like tucked into the cover */}
          <motion.div
            className="absolute bottom-12 right-1/4 hidden md:block opacity-80"
            initial={prefersReduced ? false : { opacity: 0, x: -20, rotate: -15 }}
            animate={{ opacity: 0.8, x: 0, rotate: -8 }}
            transition={{ delay: 0.7, duration: 0.7 }}
          >
            <SketchPaperPlane size={32} color="amber" />
          </motion.div>

          <div className="flex items-start justify-between gap-4 flex-wrap relative">
            <div className="flex-1 min-w-[200px]">
              {/* Handwritten annotation above heading */}
              <motion.div
                className="mb-3"
                initial={prefersReduced ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <HandwrittenText as="p" color="amber" className="text-2xl rotate-[-3deg] inline-block">
                  {greeting}, {firstName} 👋
                </HandwrittenText>
              </motion.div>

              {/* Serif display headline — embossed feel, like pressed into notebook cover */}
              <h1 className="font-serif-display embossed-title text-4xl sm:text-6xl leading-[1.02]">
                Your academic day,
                <br className="hidden sm:block" />
                <span className="relative inline-block italic">
                  sorted.
                  <HandwrittenText
                    as="span"
                    color="amber"
                    className="absolute -top-7 -right-6 text-2xl rotate-[8deg] hidden sm:block not-italic"
                  >
                    !
                  </HandwrittenText>
                </span>
              </h1>

              <p className="mt-4 text-sm sm:text-base opacity-90 max-w-md leading-relaxed">
                {profile
                  ? `${profile.branchName} · Semester ${profile.semester}`
                  : "Sign in to see your CGPA, attendance and results."}
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-7">
                <button
                  onClick={() => set("calculators")}
                  className="btn-tactile px-5 py-2.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-sm font-medium flex items-center gap-2 border border-white/25"
                >
                  <Sparkles className="size-4" />
                  Open a calculator
                </button>
                {!isSupporter && (
                  <button
                    onClick={() => setSupportOpen(true)}
                    className="btn-tactile px-5 py-2.5 rounded-full bg-white text-primary text-sm font-semibold hover:bg-white/90 shadow-soft flex items-center gap-2"
                  >
                    <Heart className="size-3.5" fill="currentColor" />
                    Go ad-free · ₹99
                  </button>
                )}
              </div>
            </div>
            {/* Editorial illustration cluster */}
            <div className="hidden sm:block relative">
              <motion.div
                className="flex items-end gap-1"
                initial={prefersReduced ? false : { opacity: 0, scale: 0.85, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 16 }}
              >
                <SketchNotebook size={120} color="plum" />
                <div className="-ml-3 -mb-1">
                  <SketchPencil size={44} color="amber" />
                </div>
              </motion.div>
              {/* Tiny floating sketch arrow accent */}
              <motion.div
                className="absolute -top-3 -left-8"
                initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <SketchArrow size={36} color="amber" />
              </motion.div>
            </div>
          </div>
        </GradientCard>
      </motion.div>

      {/* Quick stats — index cards pinned to a corkboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current CGPA"
          value={<AnimatedCounter value={8.31} decimals={2} />}
          icon={<TrendingUp className="size-5" />}
          accent="plum"
          variant="index"
          rotate={-1}
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
          variant="index"
          rotate={1}
          hint="2 subjects at risk"
        />
        <StatCard
          label="Papers"
          value={<AnimatedCounter value={1280} />}
          icon={<FileText className="size-5" />}
          accent="mint"
          variant="index"
          rotate={-0.5}
          hint="Available to download"
        />
        <StatCard
          label="Notices"
          value={<AnimatedCounter value={6} />}
          icon={<Bell className="size-5" />}
          accent="coral"
          variant="index"
          rotate={0.5}
          hint="2 unread this week"
        />
      </div>

      {/* Quick actions — calculator shortcuts */}
      <section>
        <SectionHeader
          title="Quick actions"
          subtitle="Jump straight into a calculator"
          onSeeAll={() => set("calculators" as NavKey)}
          accent="let's go!"
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
                style={{ transform: `rotate(${i % 2 === 0 ? -0.5 : 0.5}deg)` }}
                className="btn-tactile paper-card paper-card-hover rounded-2xl p-4 text-left group"
              >
                <div
                  className={`size-10 rounded-xl flex items-center justify-center mb-3 border border-foreground/10 ${
                    calc.accent === "plum"
                      ? "bg-primary/15 text-primary"
                      : calc.accent === "amber"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        : calc.accent === "mint"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                  }`}
                >
                  <Icon className="size-5" />
                </div>
                <p className="font-serif-display text-base leading-tight">{calc.title.replace(" Calculator", "")}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
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

      {/* Editorial divider */}
      <EditorialDivider ornament="diamond" label="your day at a glance" />

      {/* Ad */}
      <BannerAd slot="home-top" />

      {/* Two-column section: recent activity + upcoming */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent calculations — feels like a notebook page with entries */}
        <GlassCard variant="lined" className="lg:col-span-2 p-5 pl-12 relative">
          <div className="tape-corner-tr" aria-hidden="true" />
          <SectionHeader
            title="Recent activity"
            subtitle="What you calculated recently"
            compact
            accent="keep going!"
          />
          <div className="space-y-1.5">
            {recentHistory.map((h) => (
              <button
                key={h.id}
                onClick={() => set("calculators")}
                className="w-full flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg hover:bg-primary/5 transition text-left border border-transparent hover:border-primary/15"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/15">
                    {h.type === "SGPA" && <Trophy className="size-4" />}
                    {h.type === "CGPA" && <Award className="size-4" />}
                    {h.type === "ATTENDANCE" && <CalendarCheck className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif-display text-sm truncate">
                      {h.label ?? h.type}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 italic">
                      <Clock className="size-3" />
                      {formatRelativeTime(h.output.computedAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="stamped-number text-xl tabular-nums">
                    {h.output.value.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-bold">
                    {h.type}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Attendance gauge — kraft paper, hand-drawn feel */}
        <GlassCard variant="kraft" className="p-5 pt-7 relative">
          <CardDecoration variant="cornerHeart" position="top-right" color="coral" />
          <SectionHeader title="Attendance" subtitle="This semester" compact accent="almost there!" />
          <div className="flex flex-col items-center justify-center py-3">
            <CircularProgress
              value={78.2}
              size={140}
              label={
                <span className="stamped-number text-3xl">
                  <AnimatedCounter value={78.2} decimals={1} />%
                </span>
              }
              sublabel="Overall"
              color="oklch(0.55 0.18 25)"
            />
            <p className="mt-3 text-xs text-foreground/70 text-center italic">
              <span className="text-rose-700 dark:text-rose-400 font-semibold not-italic">2 subjects</span> below 75% threshold
            </p>
            <button
              onClick={() => set("calculators")}
              className="btn-tactile mt-3 text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              Check required classes <ChevronRight className="size-3" />
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Editorial divider */}
      <EditorialDivider ornament="star" label="from the university" />

      {/* Notices */}
      <section>
        <SectionHeader
          title="Latest notices"
          subtitle="From the university"
          onSeeAll={() => set("notices" as NavKey)}
          accent="fresh today"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recentNotices.map((n, i) => (
            <GlassCard
              key={n.id}
              variant="paper"
              hover
              className="p-4 cursor-pointer"
              onClick={() => set("notices" as NavKey)}
            >
              {/* Tape strip on first card — feels pinned up */}
              {i === 0 && <div className="tape-corner-tl" aria-hidden="true" />}
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-[0.15em] text-primary font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/15">
                  {n.category}
                </span>
                {n.pinned && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20">
                    ★ Pinned
                  </span>
                )}
              </div>
              <p className="font-serif-display text-sm leading-snug line-clamp-2">
                {n.title}
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic flex items-center gap-1">
                <Clock className="size-3" />
                {formatRelativeTime(n.publishedAt)}
              </p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Editorial divider */}
      <EditorialDivider ornament="diamond" label="what's next" />

      {/* Upcoming + Continue Reading */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Upcoming academic event */}
        <GlassCard variant="kraft" className="p-5 relative">
          <CardDecoration variant="pageFold" />
          <SectionHeader title="Upcoming" subtitle="Next on your calendar" compact accent="don't miss!" />
          <div className="flex items-start gap-4 p-3 rounded-lg border border-foreground/10 bg-foreground/[0.03]">
            <div className="text-center shrink-0 px-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-foreground/60 font-bold">
                {new Date(upcomingEvent.startDate).toLocaleString("en-IN", { month: "short" })}
              </p>
              <p className="stamped-number text-3xl text-primary">
                {new Date(upcomingEvent.startDate).getDate()}
              </p>
            </div>
            <div className="min-w-0 border-l border-foreground/15 pl-3">
              <p className="font-serif-display text-sm leading-snug">{upcomingEvent.title}</p>
              <p className="text-xs text-foreground/70 mt-1 line-clamp-2 italic">
                {upcomingEvent.description}
              </p>
              <button
                onClick={() => set("calendar" as NavKey)}
                className="btn-tactile mt-2 text-xs text-primary hover:underline font-semibold flex items-center gap-1"
              >
                View calendar <ChevronRight className="size-3" />
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Continue reading — notebook page */}
        <GlassCard variant="lined" className="p-5 pl-12 relative">
          <CardDecoration variant="cornerStar" position="top-right" color="amber" />
          <SectionHeader
            title="Continue reading"
            subtitle="Recently viewed papers"
            onSeeAll={() => set("papers" as NavKey)}
            compact
            accent="pick up where you left off"
          />
          <div className="space-y-1">
            {recentPapers.slice(0, 3).map((p) => (
              <button
                key={p.id}
                onClick={() => set("papers" as NavKey)}
                className="w-full flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-primary/5 transition text-left border border-transparent hover:border-primary/15"
              >
                <div className="size-9 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif-display text-sm truncate">{p.subjectName}</p>
                  <p className="text-xs text-muted-foreground italic">
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
        <GradientCard gradient="warm" float className="p-6 sm:p-8 relative overflow-hidden">
          <FloatingParticles count={4} colors={["amber", "coral"]} />
          {/* Tiny sketch heart accent */}
          <div className="absolute top-4 right-4 opacity-60">
            <SketchHeart size={20} color="coral" />
          </div>
          <div className="flex items-center gap-5 flex-wrap relative">
            {/* Editorial illustration */}
            <div className="shrink-0">
              <SketchBooks size={84} color="amber" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <HandwrittenText as="p" color="amber" className="text-xl rotate-[-2deg] inline-block mb-1">
                Hey friend!
              </HandwrittenText>
              <h3 className="font-serif-display text-2xl sm:text-3xl tracking-tight embossed-title">
                Love KTU One?
              </h3>
              <p className="text-sm opacity-90 mt-2 max-w-md leading-relaxed">
                Support development for ₹99 lifetime. Remove ads, get a badge,
                and help every KTU student.
              </p>
            </div>
            <button
              onClick={() => setSupportOpen(true)}
              className="btn-tactile-warm text-primary-foreground px-5 py-2.5 rounded-full font-semibold flex items-center gap-2"
            >
              <Heart className="size-4" fill="currentColor" />
              Become a Supporter
            </button>
          </div>
        </GradientCard>
      )}

      {/* Footer note — editorial colophon */}
      <footer className="pt-8 pb-2">
        <EditorialDivider ornament="diamond" />
        <div className="text-center">
          <p className="font-handwritten text-base text-muted-foreground">
            made with 💜 for KTU students
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-1 tracking-wide">
            {UNIVERSITY_NAME} · v{APP_VERSION}
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  onSeeAll,
  compact,
  accent,
}: {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  compact?: boolean;
  accent?: string;
}) {
  return (
    <div className={`flex items-end justify-between gap-4 ${compact ? "mb-3" : "mb-5"}`}>
      <div className="flex items-start gap-3">
        {/* Vertical accent bar — feels like a margin note rule */}
        <div className="w-1 self-stretch rounded-full bg-gradient-to-b from-primary/50 via-primary/25 to-transparent mt-1" />
        <div>
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h2 className={`font-serif-display tracking-tight ${compact ? "text-lg" : "text-2xl"}`}>
              {title}
            </h2>
            {accent && (
              <HandwrittenText as="span" color="amber" className="text-lg rotate-[-3deg]">
                {accent}
              </HandwrittenText>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 italic">{subtitle}</p>
          )}
        </div>
      </div>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="btn-tactile text-xs text-primary hover:underline font-medium flex items-center gap-1 shrink-0 px-2 py-1 rounded-full hover:bg-primary/5"
        >
          See all <ArrowRight className="size-3" />
        </button>
      )}
    </div>
  );
}
