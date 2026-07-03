"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Bell, Pin, ExternalLink, FileText, ChevronLeft, X } from "lucide-react";
import { EmptyState } from "@/components/ui-custom/empty-state";
import { SketchBooks } from "@/components/ui-custom/sketch-elements";
import { BannerAd } from "@/components/ui-custom/banner-ad";
import { getNotices } from "@/features/notices/actions";
import { hapticSync } from "@/lib/utils/haptics";
import { formatRelativeTime, formatDate } from "@/lib/utils/calc";
import type { KTUNotice, NoticeCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const categories: (NoticeCategory | "All")[] = [
  "All",
  "Academic",
  "Examination",
  "Scholarship",
  "Placement",
  "Cultural",
  "General",
];

export function Notices() {
  const [filter, setFilter] = useState<NoticeCategory | "All">("All");
  const [selected, setSelected] = useState<KTUNotice | null>(null);
  const prefersReduced = useReducedMotion();

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ["notices", filter],
    queryFn: () => getNotices(filter),
    staleTime: 60 * 1000,
  });

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div>
        <div className="section-eyebrow">Updates</div>
        <h1 className="section-title text-[30px] mt-1">Notices</h1>
        <p className="text-[13.5px] mt-2 max-w-lg text-muted-foreground">
          Latest from APJ Abdul Kalam Technological University.
        </p>
      </div>

      {/* ===== CATEGORY FILTER ===== */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
              filter === c
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-[#4a3e30]",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* ===== NOTICES LIST ===== */}
      {isLoading ? (
        <div className="card p-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-4 border-t border-border">
              <div className="h-4 w-3/4 shimmer rounded mb-2" />
              <div className="h-3 w-1/2 shimmer rounded" />
            </div>
          ))}
        </div>
      ) : notices.length === 0 ? (
        <EmptyState
          title="No notices in this category"
          description="Try a different category filter."
          illustration={<SketchBooks size={96} color="amber" />}
        />
      ) : (
        <div className="card p-2">
          {notices.map((n, i) => (
            <motion.button
              key={n.id}
              initial={prefersReduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.25 }}
              onClick={() => {
                hapticSync("light");
                setSelected(n);
              }}
              className="w-full text-left px-4 py-4 border-t border-border card-hover rounded-md first:border-t-0"
            >
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="tag">{n.category}</span>
                {n.pinned && (
                  <span className="tag tag-amber flex items-center gap-1">
                    <Pin className="size-2.5" /> Pinned
                  </span>
                )}
                {!n.read && (
                  <span className="tag tag-amber">New</span>
                )}
              </div>
              <p className="text-[13.5px] font-medium leading-snug line-clamp-2">{n.title}</p>
              <p className="text-[13px] text-muted-foreground mt-1 line-clamp-1">{n.description}</p>
              <p className="text-[11.5px] font-mono mt-2 text-[color:var(--text-faint)]">
                {formatRelativeTime(n.publishedAt)}
              </p>
            </motion.button>
          ))}
        </div>
      )}

      <div className="mt-6">
        <BannerAd slot="notices-list" />
      </div>

      {/* ===== DETAIL SHEET ===== */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
            />
            <motion.div
              className="card relative w-full sm:max-w-2xl rounded-t-[10px] sm:rounded-[10px] max-h-[90vh] overflow-y-auto"
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="sticky top-0 z-10 glass-strong border-b border-border px-6 py-4 flex items-center justify-between gap-4">
                <button
                  onClick={() => setSelected(null)}
                  className="btn-ghost size-9 rounded-md flex items-center justify-center"
                  aria-label="Back"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <span className="tag">{selected.category}</span>
                <button
                  onClick={() => setSelected(null)}
                  className="btn-ghost size-9 rounded-md flex items-center justify-center ml-auto"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="p-6">
                <h2 className="section-title text-xl">{selected.title}</h2>
                <p className="text-xs font-mono mt-2 text-[color:var(--text-faint)]">
                  Published {formatDate(selected.publishedAt)} · {formatRelativeTime(selected.publishedAt)}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {selected.description}
                </p>
                {selected.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    {selected.tags.map((t) => (
                      <span key={t} className="tag">#{t}</span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-6">
                  {selected.pdfUrl && (
                    <a
                      href={selected.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary flex-1 h-10 rounded-md text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <FileText className="size-4" /> View PDF
                    </a>
                  )}
                  {selected.externalUrl && (
                    <a
                      href={selected.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost flex-1 h-10 rounded-md text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="size-4" /> Open link
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
