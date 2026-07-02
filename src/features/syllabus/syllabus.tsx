"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, Search, Download, Bookmark, BookmarkCheck, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { EmptyState } from "@/components/ui-custom/empty-state";
import { SketchNotebook } from "@/components/ui-custom/sketch-elements";
import { BannerAd } from "@/components/ui-custom/banner-ad";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSyllabus, type SyllabusFilters } from "@/features/syllabus/actions";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div>
      <PageHeader
        title="Syllabus"
        description="Official KTU syllabus documents for every subject, branch and semester."
        icon={<BookOpen className="size-5" />}
      />

      <GlassCard className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subject name or code..."
              className="pl-10 h-11 bg-background"
            />
          </div>
          <Select value={branch} onValueChange={(v) => setBranch(v as BranchCode | "ALL")}>
            <SelectTrigger className="h-11 bg-background sm:w-[140px]">
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
            <SelectTrigger className="h-11 bg-background sm:w-[110px]">
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
      </GlassCard>

      <p className="text-sm text-muted-foreground mb-3 px-1">
        <span className="font-medium text-foreground">{syllabus.length}</span> syllabus documents
      </p>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : syllabus.length === 0 ? (
        <EmptyState
          accent="hmm…"
          title="No syllabus found"
          description="Try a different search term or branch filter. Syllabus documents are added by admins throughout the semester."
          illustration={<SketchNotebook size={120} color="plum" />}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {syllabus.map((s, i) => {
            const bookmarked = hasBookmark("syllabus", s.id);
            return (
              <motion.div
                key={s.id}
                initial={prefersReduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.4 }}
              >
                <GlassCard hover className="p-4 flex items-start gap-3">
                  <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug line-clamp-2">
                      {s.subjectName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {s.subjectCode} · {s.branchCode} · S{s.semester}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">
                        {s.modules} modules
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {s.version}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        Updated {formatDate(s.lastUpdated)}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="h-8 flex-1 rounded-full"
                        onClick={() => {
                          getAnalyticsProvider().track({ name: "paper_downloaded", props: { paperId: s.id } });
                          getNotificationProvider().show({
                            kind: "info",
                            title: "Preparing download…",
                            message: s.title,
                          });
                          window.open(`/api/v1/syllabus/${s.id}/download`, "_blank", "noopener,noreferrer");
                        }}
                      >
                        <Download className="size-3.5 mr-1" /> Download
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 rounded-full"
                        onClick={() => {
                          toggleBookmark({
                            kind: "syllabus",
                            refId: s.id,
                            title: s.subjectName,
                          });
                          getNotificationProvider().show({
                            kind: bookmarked ? "info" : "success",
                            title: bookmarked ? "Removed bookmark" : "Bookmarked",
                            message: s.subjectName,
                          });
                        }}
                      >
                        {bookmarked ? (
                          <BookmarkCheck className="size-3.5 text-primary" fill="currentColor" />
                        ) : (
                          <Bookmark className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </GlassCard>
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
