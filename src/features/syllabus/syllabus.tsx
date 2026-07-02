"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, Search, Download, Bookmark, BookmarkCheck, Eye, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui-custom/empty-state";
import { SketchNotebook } from "@/components/ui-custom/sketch-elements";
import { BannerAd } from "@/components/ui-custom/banner-ad";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSyllabus, type SyllabusFilters } from "@/features/syllabus/actions";
import { BRANCHES, SEMESTERS } from "@/lib/constants";
import { formatDate } from "@/lib/utils/calc";
import { useBookmarks } from "@/features/bookmarks/use-bookmarks";
import { getNotificationProvider } from "@/lib/providers/notification";
import { getAnalyticsProvider } from "@/lib/providers/analytics";
import type { BranchCode, SemesterNumber } from "@/lib/types";

export function Syllabus() {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState<BranchCode | "ALL">("ALL");
  const [semester, setSemester] = useState<SemesterNumber | "ALL">("ALL");
  const prefersReduced = useReducedMotion();
  const { toggle: toggleBookmark, has: hasBookmark } = useBookmarks();

  const filters: SyllabusFilters = { search, branch, semester };
  const { data: syllabus = [], isLoading } = useQuery({
    queryKey: ["syllabus", filters],
    queryFn: () => getSyllabus(filters),
    staleTime: 60 * 1000,
  });

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div>
        <div className="section-eyebrow">Library</div>
        <h1 className="section-title text-[30px] mt-1">Syllabus</h1>
        <p className="text-[13.5px] mt-2 max-w-lg text-muted-foreground">
          Official KTU syllabus documents for every subject, branch and semester.
        </p>
      </div>

      {/* ===== FILTER BAR ===== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-md border border-border">
          <Search className="size-[15px] text-[color:var(--text-faint)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject name or code…"
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
        <Select
          value={String(semester)}
          onValueChange={(v) =>
            setSemester(v === "ALL" ? "ALL" : (Number(v) as SemesterNumber))
          }
        >
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
      </div>

      {/* ===== SYLLABUS LIST ===== */}
      {isLoading ? (
        <div className="card p-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-4 border-t border-border">
              <div className="h-4 w-2/3 shimmer rounded mb-2" />
              <div className="h-3 w-1/3 shimmer rounded" />
            </div>
          ))}
        </div>
      ) : syllabus.length === 0 ? (
        <EmptyState
          title="No syllabus found"
          description="Try a different search term or branch filter."
          illustration={<SketchNotebook size={96} color="plum" />}
        />
      ) : (
        <div className="card p-2">
          {syllabus.map((s, i) => {
            const bookmarked = hasBookmark("syllabus", s.id);
            return (
              <motion.div
                key={s.id}
                initial={prefersReduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
                className="px-4 py-4 border-t border-border card-hover rounded-md first:border-t-0 group"
              >
                <div className="flex items-start gap-3">
                  <div className="icon-box shrink-0">
                    <FileText className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-medium leading-snug line-clamp-2">
                      {s.subjectName}
                    </p>
                    <p className="text-[12px] font-mono mt-1 text-muted-foreground">
                      {s.subjectCode} · {s.branchCode} · S{s.semester}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="tag">{s.modules} modules</span>
                      <span className="tag">{s.version}</span>
                      <span className="text-[10px] font-mono text-[color:var(--text-faint)] ml-auto">
                        Updated {formatDate(s.lastUpdated)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const added = toggleBookmark({
                        kind: "syllabus",
                        refId: s.id,
                        title: s.title,
                      });
                      getNotificationProvider().show({
                        kind: added ? "success" : "info",
                        title: added ? "Bookmarked" : "Removed bookmark",
                        message: s.title,
                      });
                    }}
                    className="size-8 rounded flex items-center justify-center hover:bg-secondary shrink-0"
                    aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
                  >
                    {bookmarked ? (
                      <BookmarkCheck className="size-4 text-primary" fill="currentColor" />
                    ) : (
                      <Bookmark className="size-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      getAnalyticsProvider().track({ name: "paper_downloaded", props: { paperId: s.id } });
                      getNotificationProvider().show({
                        kind: "info",
                        title: "Preparing download…",
                        message: s.title,
                      });
                      window.open(`/api/v1/syllabus/${s.id}/download`, "_blank", "noopener,noreferrer");
                    }}
                    className="btn-primary flex-1 h-9 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Download className="size-3.5" /> Download
                  </button>
                  <button
                    onClick={() => window.open(`/api/v1/syllabus/${s.id}/download`, "_blank", "noopener,noreferrer")}
                    className="btn-ghost h-9 w-9 rounded-md flex items-center justify-center"
                    aria-label="View PDF"
                  >
                    <Eye className="size-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <BannerAd slot="syllabus-list" />
      </div>
    </div>
  );
}
