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
  FileText,
  Clock,
} from "lucide-react";
import { EmptyState } from "@/components/ui-custom/empty-state";
import { SketchBooks } from "@/components/ui-custom/sketch-elements";
import { BannerAd } from "@/components/ui-custom/banner-ad";
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

  // Split: recent (last 7 days) + rest
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentPapers = papers.filter(
    (p) => new Date(p.uploadedAt).getTime() > sevenDaysAgo,
  );
  const otherPapers = papers.filter(
    (p) => new Date(p.uploadedAt).getTime() <= sevenDaysAgo,
  );

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div>
        <div className="section-eyebrow">Library</div>
        <h1 className="section-title text-[28px] md:text-[32px] mt-1.5">Question papers</h1>
        <p className="text-[14px] mt-2 max-w-lg text-muted-foreground leading-relaxed">
          Browse previous KTU question papers by branch, semester and year.
        </p>
      </div>

      {/* ===== FILTER BAR ===== */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] border border-border bg-secondary">
          <Search className="size-4 text-[color:var(--text-faint)] shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject, code or title…"
            className="bg-transparent outline-none text-[14px] w-full placeholder:text-[color:var(--text-faint)] border-none shadow-none focus:ring-0"
            style={{ background: "transparent", border: "none", boxShadow: "none" }}
          />
        </div>
        <Select value={branch} onValueChange={(v) => setBranch(v as BranchCode | "ALL")}>
          <SelectTrigger className="h-[44px] sm:w-[140px] text-[13px] rounded-[10px]">
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
          <SelectTrigger className="h-[44px] sm:w-[110px] text-[13px] rounded-[10px]">
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
          <SelectTrigger className="h-[44px] sm:w-[110px] text-[13px] rounded-[10px]">
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
            className="btn-ghost h-[44px] px-3.5 rounded-[10px] text-[13px] font-medium flex items-center gap-1.5 whitespace-nowrap"
          >
            <X className="size-4" /> Clear
          </button>
        )}
      </div>

      {/* ===== PAPERS GRID ===== */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="h-32 shimmer" />
              <div className="p-3.5 space-y-2">
                <div className="h-3.5 w-3/4 shimmer rounded" />
                <div className="h-3 w-1/2 shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : papers.length === 0 ? (
        <EmptyState
          title="No papers found"
          description="Try changing your filters or searching for a different subject."
          illustration={<SketchBooks size={80} color="lavender" />}
          primaryAction={{ label: "Clear filters", onClick: clearFilters }}
        />
      ) : (
        <div className="space-y-8">
          {/* Recent papers section */}
          {recentPapers.length > 0 && !hasFilters && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="size-3.5 text-muted-foreground" />
                <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Recently added
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {recentPapers.slice(0, 4).map((p, i) => (
                  <PaperCard
                    key={p.id}
                    paper={p}
                    index={i}
                    prefersReduced={prefersReduced}
                    bookmarked={hasBookmark("paper", p.id)}
                    onBookmark={() => onBookmark(p.id, p.subjectName)}
                    onDownload={() => onDownload(p.id, p.title)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All papers section */}
          <div>
            {recentPapers.length > 0 && !hasFilters && (
              <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                All papers
              </h2>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(hasFilters ? papers : otherPapers.length > 0 ? otherPapers : papers).map((p, i) => (
                <PaperCard
                  key={p.id}
                  paper={p}
                  index={i}
                  prefersReduced={prefersReduced}
                  bookmarked={hasBookmark("paper", p.id)}
                  onBookmark={() => onBookmark(p.id, p.subjectName)}
                  onDownload={() => onDownload(p.id, p.title)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ad */}
      <div className="mt-6">
        <BannerAd slot="papers-list" />
      </div>
    </div>
  );
}

/* ========================================================================== */
/* PAPER CARD — Apple Files-inspired document card                          */
/* ========================================================================== */

interface PaperCardProps {
  paper: {
    id: string;
    title: string;
    subjectCode: string;
    subjectName: string;
    semester: number;
    branchCode: string;
    year: number;
    month: number;
    examType: string;
    fileSizeBytes: number;
    pageCount: number;
    downloads: number;
    views: number;
    uploadedAt: string;
  };
  index: number;
  prefersReduced: boolean | null;
  bookmarked: boolean;
  onBookmark: () => void;
  onDownload: () => void;
}

function PaperCard({ paper, index, prefersReduced, bookmarked, onBookmark, onDownload }: PaperCardProps) {
  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.05, 0.4),
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="card card-hover overflow-hidden flex flex-col group"
    >
      {/* PDF Thumbnail — Apple Files style */}
      <div className="pdf-thumb h-28 sm:h-32 relative">
        <div className="pdf-thumb-icon">
          <FileText className="size-10" strokeWidth={1.2} />
        </div>
        {/* Bookmark button — top right, appears on hover */}
        <button
          onClick={onBookmark}
          className="absolute top-2 right-2 size-8 rounded-lg bg-black/30 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/50"
          aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
        >
          {bookmarked ? (
            <BookmarkCheck className="size-4 text-amber-400" fill="currentColor" />
          ) : (
            <Bookmark className="size-4 text-white/80" />
          )}
        </button>
        {/* Exam type badge — bottom left */}
        <span className="absolute bottom-2 left-2 tag tag-amber" style={{ fontSize: "9px", padding: "2px 6px" }}>
          {paper.examType.replace("_", " ")}
        </span>
      </div>

      {/* Body */}
      <div className="p-3.5 flex flex-col flex-1">
        {/* Subject name */}
        <p className="text-[13px] font-medium leading-snug line-clamp-2 mb-1">
          {paper.subjectName}
        </p>
        {/* Subject code + semester */}
        <p className="text-[11px] font-mono text-muted-foreground mb-2">
          {paper.subjectCode} · S{paper.semester} · {paper.branchCode}
        </p>

        {/* Meta: year + file size */}
        <div className="flex items-center gap-2 mb-3 text-[10px] font-mono text-[color:var(--text-faint)]">
          <span>{paper.month === 5 ? "May" : "Nov"} {paper.year}</span>
          <span>·</span>
          <span>{formatBytes(paper.fileSizeBytes)}</span>
          <span>·</span>
          <span>{formatNumber(paper.downloads)} ↓</span>
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-1.5">
          <button
            onClick={onDownload}
            className="btn-primary flex-1 h-8 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1"
          >
            <Download className="size-3" /> Open
          </button>
          <button
            onClick={() => {
              getAnalyticsProvider().track({ name: "paper_viewed", props: { paperId: paper.id } });
              window.open(`/api/v1/papers/${paper.id}/download`, "_blank", "noopener,noreferrer");
            }}
            className="btn-ghost h-8 w-8 rounded-lg flex items-center justify-center"
            aria-label="View PDF"
          >
            <Eye className="size-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
