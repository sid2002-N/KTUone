"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, X, Clock, FileText, BookOpen, Bell, CalendarDays, TrendingUp, Loader2 } from "lucide-react";
import { useNavStore } from "@/store/nav-store";
import { searchAll } from "@/features/search/actions";
import { getAnalyticsProvider } from "@/lib/providers/analytics";
import type { NavKey } from "@/lib/constants";
import type { SearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/calc";

type ResultKind = "paper" | "syllabus" | "notice" | "calendar" | "subject";

type DisplayResult = SearchResult & { kind: ResultKind };

function isDisplayResult(r: SearchResult): r is DisplayResult {
  return (
    r.kind === "paper" ||
    r.kind === "syllabus" ||
    r.kind === "notice" ||
    r.kind === "calendar" ||
    r.kind === "subject"
  );
}

/** Formats a SearchResult's Record<string, string|number> meta into the display
 * string the search overlay expects (matches the previous client-side format). */
function formatResultMeta(r: SearchResult): string {
  if (!r.meta) return "";
  const m = r.meta;
  switch (r.kind) {
    case "subject":
      return `${m.branch} · S${m.semester} · ${m.credits} credits`;
    case "paper": {
      const monthLabel = m.month === 5 ? "May" : "Nov";
      return `${m.branch} · S${m.semester} · ${monthLabel} ${m.year}`;
    }
    case "syllabus":
      return `${m.branch} · S${m.semester}`;
    case "notice":
      return formatRelativeTime(String(m.publishedAt));
    case "calendar":
      return formatRelativeTime(String(m.startDate));
    default:
      return "";
  }
}

const kindMeta: Record<ResultKind, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  paper: { label: "Paper", icon: FileText, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  syllabus: { label: "Syllabus", icon: BookOpen, color: "bg-primary/10 text-primary" },
  notice: { label: "Notice", icon: Bell, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  calendar: { label: "Event", icon: CalendarDays, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  subject: { label: "Subject", icon: TrendingUp, color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
};

const RECENT_KEY = "ktu_one:search:recent";

export function SearchOverlay() {
  const open = useNavStore((s) => s.searchOpen);
  const setOpen = useNavStore((s) => s.setSearchOpen);
  const setNav = useNavStore((s) => s.set);
  const prefersReduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        Promise.resolve().then(() => setRecent(parsed));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      Promise.resolve().then(() => setQuery(""));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const { data: rawResults = [], isFetching } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchAll(query),
    enabled: query.trim().length >= 1,
    staleTime: 30 * 1000,
  });

  const results = rawResults.filter(isDisplayResult);

  const saveRecent = (q: string) => {
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, 6);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const handleResultClick = (r: DisplayResult) => {
    saveRecent(query);
    getAnalyticsProvider().track({
      name: "search_performed",
      props: { query, resultCount: results.length },
    });
    const navMap: Record<ResultKind, NavKey> = {
      paper: "papers",
      syllabus: "syllabus",
      notice: "notices",
      calendar: "calendar",
      subject: "papers",
    };
    setNav(navMap[r.kind]);
    setOpen(false);
  };

  // Group results inline (preserves kindMeta ordering) — no useMemo needed.
  const grouped = (Object.keys(kindMeta) as ResultKind[])
    .map((k): [ResultKind, DisplayResult[]] => [k, results.filter((r) => r.kind === k)])
    .filter(([, items]) => items.length > 0);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95]">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 top-[8vh] w-full max-w-2xl px-4"
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <div className="glass-strong rounded-3xl shadow-floating overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
                <Search className="size-5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search subjects, papers, syllabus, notices..."
                  className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground"
                />
                <kbd className="hidden sm:block text-[10px] px-2 py-1 rounded bg-secondary text-muted-foreground font-mono">
                  ESC
                </kbd>
                <button
                  onClick={() => setOpen(false)}
                  className="size-8 rounded-lg hover:bg-secondary flex items-center justify-center"
                  aria-label="Close search"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Results / recent */}
              <div className="max-h-[60vh] overflow-y-auto">
                {!query.trim() ? (
                  <div className="p-4">
                    {recent.length > 0 ? (
                      <>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold px-2 mb-2">
                          Recent searches
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {recent.map((r) => (
                            <button
                              key={r}
                              onClick={() => setQuery(r)}
                              className="px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/70 text-sm flex items-center gap-1.5"
                            >
                              <Clock className="size-3" /> {r}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-sm text-muted-foreground">
                        Search across papers, syllabus, notices, calendar and more.
                      </div>
                    )}
                  </div>
                ) : isFetching && results.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="size-6 text-muted-foreground animate-spin" />
                    <p className="text-sm text-muted-foreground">Searching…</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No results for &quot;{query}&quot;
                    </p>
                  </div>
                ) : (
                  grouped.map(([kind, items]) => {
                    const meta = kindMeta[kind];
                    const Icon = meta.icon;
                    return (
                      <div key={kind} className="py-2">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold px-5 py-1.5 flex items-center gap-1.5">
                          <Icon className="size-3" /> {meta.label}
                        </p>
                        {items.map((r) => {
                          const RIcon = kindMeta[r.kind].icon;
                          const metaStr = formatResultMeta(r);
                          return (
                            <button
                              key={`${r.kind}_${r.id}`}
                              onClick={() => handleResultClick(r)}
                              className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-secondary/60 transition text-left"
                            >
                              <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0", kindMeta[r.kind].color)}>
                                <RIcon className="size-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{r.title}</p>
                                {r.subtitle && (
                                  <p className="text-xs text-muted-foreground">{r.subtitle}</p>
                                )}
                              </div>
                              {metaStr && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {metaStr}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border/40 px-5 py-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
                <span>Press <kbd className="px-1.5 py-0.5 rounded bg-secondary font-mono">↵</kbd> to open</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
