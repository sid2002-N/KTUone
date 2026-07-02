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
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="mb-2">
        <div className="section-eyebrow">Library</div>
        <h1 className="section-title text-[30px] mt-1">Question papers</h1>
        <p className="text-[13.5px] mt-2 max-w-lg text-muted-foreground">
          Browse previous KTU question papers by branch, semester and year.
        </p>
      </div>

      {/* ===== FILTER BAR ===== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-md border border-border">
          <Search className="size-[15px] text-[color:var(--text-faint)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject, code or title…"
            className="bg-transparent outline-none text-[13.5px] w-full placeholder:text-[color:var(--text-faint)]"
          />
        </div>
        <Select value={branch} onValueChange={(v) => setBranch(v as BranchCode | "ALL")}>
          <SelectTrigger className="h-[42px] sm:w-[150px] text-[13px]">
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
          <SelectTrigger className="h-[42px] sm:w-[120px] text-[13px]">
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
          <SelectTrigger className="h-[42px] sm:w-[120px] text-[13px]">
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
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="btn-ghost h-[42px] px-4 rounded-md text-[13px] font-medium flex items-center gap-1.5 whitespace-nowrap"
          >
            <X className="size-4" /> Clear
          </button>
        )}
      </div>

      {/* ===== PAPERS TABLE ===== */}
      {isLoading ? (
        <div className="card p-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3.5 border-t border-border">
              <div className="h-4 w-2/3 shimmer rounded" />
            </div>
          ))}
        </div>
      ) : papers.length === 0 ? (
        <EmptyState
          title="No papers found"
          description="Try changing your filters or searching for a different subject."
          illustration={<SketchBooks size={96} color="lavender" />}
          primaryAction={{ label: "Clear filters", onClick: clearFilters }}
        />
      ) : (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="card p-2"
        >
          {/* Table header — desktop only */}
          <div className="hidden md:grid grid-cols-12 px-4 py-2.5 text-[11px] font-mono uppercase tracking-wide text-[color:var(--text-faint)]">
            <div className="col-span-5">Subject</div>
            <div className="col-span-2">Code</div>
            <div className="col-span-2">Semester</div>
            <div className="col-span-2">Year</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {/* Rows */}
          {papers.map((p, i) => {
            const bookmarked = hasBookmark("paper", p.id);
            return (
              <motion.div
                key={p.id}
                initial={prefersReduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
                className="px-4 py-3.5 border-t border-border card-hover rounded-md
                           md:grid md:grid-cols-12 md:items-center group"
              >
                {/* Subject name + mobile meta */}
                <div className="text-[14px] md:text-[13.5px] md:col-span-5 flex items-center gap-2">
                  <button
                    onClick={() => onBookmark(p.id, p.subjectName)}
                    className="md:hidden size-7 rounded flex items-center justify-center hover:bg-secondary shrink-0"
                    aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
                  >
                    {bookmarked ? (
                      <BookmarkCheck className="size-4 text-primary" fill="currentColor" />
                    ) : (
                      <Bookmark className="size-4 text-muted-foreground" />
                    )}
                  </button>
                  <span className="line-clamp-1">{p.subjectName}</span>
                </div>

                {/* Mobile: meta row */}
                <div className="flex items-center justify-between mt-1.5 md:mt-0 md:contents">
                  <span className="font-mono text-[12px] md:text-[12.5px] md:col-span-2 text-muted-foreground">
                    {p.subjectCode}
                  </span>
                  <span className="text-[12px] md:text-[12.5px] md:col-span-2 text-muted-foreground">
                    S{p.semester} · {p.branchCode}
                  </span>
                  <span className="font-mono text-[12px] md:text-[12.5px] md:col-span-2 text-muted-foreground">
                    {p.month === 5 ? "May" : "Nov"} {p.year}
                  </span>

                  {/* Desktop: action buttons */}
                  <div className="hidden md:flex md:col-span-1 justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onBookmark(p.id, p.subjectName)}
                      className="size-7 rounded flex items-center justify-center hover:bg-secondary"
                      aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
                    >
                      {bookmarked ? (
                        <BookmarkCheck className="size-4 text-primary" fill="currentColor" />
                      ) : (
                        <Bookmark className="size-4 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => onDownload(p.id, p.title)}
                      className="size-7 rounded flex items-center justify-center hover:bg-secondary"
                      aria-label="Download"
                    >
                      <Download className="size-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Mobile: action buttons */}
                <div className="flex items-center gap-2 mt-2 md:hidden">
                  <button
                    onClick={() => onDownload(p.id, p.title)}
                    className="btn-primary flex-1 h-9 rounded-md text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <Download className="size-3.5" /> Download
                  </button>
                  <button
                    onClick={() => {
                      getAnalyticsProvider().track({ name: "paper_viewed", props: { paperId: p.id } });
                      window.open(`/api/v1/papers/${p.id}/download`, "_blank", "noopener,noreferrer");
                    }}
                    className="btn-ghost h-9 w-9 rounded-md flex items-center justify-center"
                    aria-label="View PDF"
                  >
                    <Eye className="size-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {/* Empty filter result footer */}
          <div className="border-t border-border py-6 flex flex-col items-center text-center">
            <div className="text-[13px] text-muted-foreground">
              That's every paper we have for your filters.
            </div>
            <button className="text-[12.5px] mt-2 underline decoration-dotted text-muted-foreground hover:text-foreground">
              Request a missing paper
            </button>
          </div>
        </motion.div>
      )}

      {/* Ad */}
      <div className="mt-6">
        <BannerAd slot="papers-list" />
      </div>
    </div>
  );
}
