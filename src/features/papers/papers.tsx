"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Search,
  Download,
  Bookmark,
  BookmarkCheck,
  Eye,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/ui-custom/empty-state";
import { SketchBooks } from "@/components/ui-custom/sketch-elements";
import { BannerAd } from "@/components/ui-custom/banner-ad";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPapers, getPaperYears, type PaperFilters } from "@/features/papers/actions";
import { BRANCHES, SEMESTERS } from "@/lib/constants";
import { formatBytes, formatNumber, formatRelativeTime } from "@/lib/utils/calc";
import { useBookmarks } from "@/features/bookmarks/use-bookmarks";
import { getNotificationProvider } from "@/lib/providers/notification";
import { getAnalyticsProvider } from "@/lib/providers/analytics";
import type { BranchCode, SemesterNumber } from "@/lib/types";

export function Papers() {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState<BranchCode | "ALL">("ALL");
  const [semester, setSemester] = useState<SemesterNumber | "ALL">("ALL");
  const [year, setYear] = useState<number | "ALL">("ALL");
  const prefersReduced = useReducedMotion();
  const { toggle: toggleBookmark, has: hasBookmark } = useBookmarks();

  const { data: years = [] } = useQuery({
    queryKey: ["papers", "years"],
    queryFn: () => getPaperYears(),
    staleTime: 60 * 1000,
  });

  const filters: PaperFilters = { search, branch, semester, year };
  const { data: papers = [], isLoading } = useQuery({
    queryKey: ["papers", filters],
    queryFn: () => getPapers(filters),
    staleTime: 60 * 1000,
  });

  const hasFilters = search || branch !== "ALL" || semester !== "ALL" || year !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setBranch("ALL");
    setSemester("ALL");
    setYear("ALL");
  };

  const onDownload = async (paperId: string, title: string) => {
    getAnalyticsProvider().track({ name: "paper_downloaded", props: { paperId } });
    getNotificationProvider().show({
      kind: "info",
      title: "Preparing download…",
      message: title,
    });
    try {
      // The download route authenticates via httpOnly cookie, generates a
      // 2-minute signed R2 URL, increments the download counter, and 302-
      // redirects. Opening in a new tab lets the browser handle the redirect
      // + PDF display without navigating the student away from the papers list.
      window.open(`/api/v1/papers/${paperId}/download`, "_blank", "noopener,noreferrer");
    } catch {
      getNotificationProvider().show({
        kind: "error",
        title: "Download failed",
        message: "Please try again or check your login.",
      });
    }
  };

  const onBookmark = (paperId: string, title: string) => {
    const added = toggleBookmark({
      kind: "paper",
      refId: paperId,
      title,
    });
    getAnalyticsProvider().track({
      name: "paper_bookmarked",
      props: { paperId, bookmarked: added },
    });
    getNotificationProvider().show({
      kind: added ? "success" : "info",
      title: added ? "Bookmarked" : "Removed bookmark",
      message: title,
    });
  };

  return (
    <div className="space-y-5">
      {/* ===== PREMIUM HERO ===== */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="papers-hero p-6 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="hero-eyebrow text-lg sm:text-xl rotate-[-2deg] inline-block mb-1">
              Library
            </p>
            <h1 className="hero-headline text-3xl sm:text-4xl lg:text-5xl">
              Question <em>papers.</em>
            </h1>
            <p className="text-sm text-[var(--luxury-text-muted)] max-w-md leading-relaxed mt-2">
              Browse, search and download KTU question papers across all branches and years.
            </p>
          </div>
          {/* Stats badge */}
          <div className="flex items-center gap-2">
            <div className="count-badge-premium px-3 py-1.5 rounded-full text-xs font-semibold">
              {papers.length} paper{papers.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== PREMIUM FILTER BAR ===== */}
      <div className="papers-filter-bar p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--luxury-text-muted)] pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subject, code or title..."
              className="pl-10 h-11"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:flex">
            <Select value={branch} onValueChange={(v) => setBranch(v as BranchCode | "ALL")}>
              <SelectTrigger className="h-11 lg:w-[140px]">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All branches</SelectItem>
                {BRANCHES.map((b) => (
                  <SelectItem key={b.code} value={b.code}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(semester)} onValueChange={(v) => setSemester(v === "ALL" ? "ALL" : (Number(v) as SemesterNumber))}>
              <SelectTrigger className="h-11 lg:w-[110px]">
                <SelectValue placeholder="Sem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All sems</SelectItem>
                {SEMESTERS.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    S{s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(v === "ALL" ? "ALL" : Number(v))}>
              <SelectTrigger className="h-11 lg:w-[110px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All years</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="paper-btn-secondary h-11 px-4 rounded-full text-sm font-medium flex items-center gap-1.5"
            >
              <X className="size-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ===== PAPERS GRID ===== */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-luxury-paper h-56 shimmer-luxury" />
          ))}
        </div>
      ) : papers.length === 0 ? (
        <EmptyState
          title="No papers found"
          description="Try changing your filters or searching for a different subject."
          illustration={<SketchBooks size={120} color="lavender" />}
          primaryAction={{ label: "Clear filters", onClick: clearFilters }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {papers.map((p, i) => {
            const bookmarked = hasBookmark("paper", p.id);
            const subjectInitial = p.subjectName.charAt(0).toUpperCase();
            return (
              <motion.div
                key={p.id}
                initial={prefersReduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.06, 0.5), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="paper-tile flex flex-col"
              >
                {/* Thumbnail — Netflix-style with subject initial */}
                <div className="paper-thumbnail h-24 flex items-center justify-center relative">
                  <span className="font-serif text-5xl font-bold text-[var(--luxury-plum)] opacity-80 select-none">
                    {subjectInitial}
                  </span>
                  {/* Bookmark button — top right */}
                  <button
                    onClick={() => onBookmark(p.id, p.subjectName)}
                    className="absolute top-2.5 right-2.5 size-8 rounded-lg bg-[oklch(0_0_0_/_0.3)] backdrop-blur-sm flex items-center justify-center transition hover:bg-[oklch(0_0_0_/_0.5)]"
                    aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
                  >
                    {bookmarked ? (
                      <BookmarkCheck className="size-4 text-[var(--luxury-amber)]" fill="currentColor" />
                    ) : (
                      <Bookmark className="size-4 text-[var(--luxury-text-muted)]" />
                    )}
                  </button>
                  {/* Exam type badge — bottom left */}
                  <span className="absolute bottom-2.5 left-2.5 badge-premium-accent px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                    {p.examType.replace("_", " ")}
                  </span>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-sm font-semibold leading-snug line-clamp-2 text-[var(--luxury-cream)]">
                    {p.subjectName}
                  </p>
                  <p className="text-xs text-[var(--luxury-text-muted)] mt-1">
                    {p.subjectCode} · {p.branchCode} · S{p.semester}
                  </p>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-[11px] text-[var(--luxury-text-muted)] mt-3 mb-3">
                    <span className="flex items-center gap-1">
                      <Eye className="size-3" /> {formatNumber(p.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="size-3" /> {formatNumber(p.downloads)}
                    </span>
                    <span className="ml-auto badge-premium px-2 py-0.5 rounded-md">
                      {p.month === 5 ? "May" : "Nov"} {p.year}
                    </span>
                  </div>

                  {/* File info */}
                  <p className="text-[10px] text-[var(--luxury-text-muted)] mb-3">
                    {p.pageCount} pages · {formatBytes(p.fileSizeBytes)} · {formatRelativeTime(p.uploadedAt)}
                  </p>

                  {/* Actions */}
                  <div className="mt-auto flex gap-2">
                    <button
                      onClick={() => onDownload(p.id, p.title)}
                      className="paper-btn-primary h-9 flex-1 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Download className="size-3.5" /> Download
                    </button>
                    <button
                      onClick={() => {
                        getAnalyticsProvider().track({ name: "paper_viewed", props: { paperId: p.id } });
                        window.open(`/api/v1/papers/${p.id}/download`, "_blank", "noopener,noreferrer");
                      }}
                      className="paper-btn-secondary h-9 w-9 rounded-full flex items-center justify-center"
                      aria-label="View PDF"
                    >
                      <Eye className="size-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Ad after papers list */}
      <div className="mt-6">
        <BannerAd slot="papers-list" />
      </div>
    </div>
  );
}
