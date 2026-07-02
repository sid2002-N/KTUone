"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Bell, Pin, ExternalLink, FileText, ChevronLeft, X } from "lucide-react";
import { EmptyState } from "@/components/ui-custom/empty-state";
import { SketchBooks } from "@/components/ui-custom/sketch-elements";
import { BannerAd } from "@/components/ui-custom/banner-ad";
import { getNotices } from "@/features/notices/actions";
import { formatRelativeTime, formatDate } from "@/lib/utils/calc";
import type { KTUNotice, NoticeCategory, NoticePriority } from "@/lib/types";
import { cn } from "@/lib/utils";

const categoryBadgeClass: Record<NoticeCategory, string> = {
  Academic: "notice-badge-academic",
  Examination: "notice-badge-examination",
  Scholarship: "notice-badge-scholarship",
  Placement: "notice-badge-placement",
  Cultural: "notice-badge-cultural",
  General: "notice-badge-general",
};

const priorityDotClass: Record<NoticePriority, string> = {
  Pinned: "timeline-dot-priority-pinned",
  High: "timeline-dot-priority-high",
  Normal: "timeline-dot-priority-normal",
  Low: "timeline-dot-priority-low",
};

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
    <div className="space-y-5">
      {/* ===== PREMIUM HERO ===== */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="notices-hero p-6 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="hero-eyebrow text-lg sm:text-xl rotate-[-2deg] inline-block mb-1">
              Updates
            </p>
            <h1 className="hero-headline text-3xl sm:text-4xl lg:text-5xl">
              University <em>notices.</em>
            </h1>
            <p className="text-sm text-[var(--luxury-text-muted)] max-w-md leading-relaxed mt-2">
              Stay updated with the latest from APJ Abdul Kalam Technological University.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="count-badge-premium px-3 py-1.5 rounded-full text-xs font-semibold">
              {notices.length} notice{notices.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== CATEGORY FILTER PILLS ===== */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              "notice-cat-pill px-3.5 py-1.5 rounded-full text-xs font-medium",
              filter === c && "active",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* ===== TIMELINE ===== */}
      {isLoading ? (
        <div className="space-y-3 pl-14">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-luxury-paper h-24 shimmer-luxury" />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <EmptyState
          accent="all caught up!"
          title="No notices in this category"
          description="You're all caught up on this category. Try a different filter or check back later for new updates."
          illustration={<SketchBooks size={120} color="amber" />}
        />
      ) : (
        <div className="notices-timeline space-y-3">
          {notices.map((n, i) => (
            <motion.div
              key={n.id}
              initial={prefersReduced ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="timeline-item"
            >
              {/* Priority dot */}
              <div className={cn("timeline-dot", priorityDotClass[n.priority])} />

              {/* Notice card */}
              <div
                onClick={() => setSelected(n)}
                className="notice-card p-4 sm:p-5"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={cn("notice-badge-cat", categoryBadgeClass[n.category])}>
                    {n.category}
                  </span>
                  {n.pinned && (
                    <span className="notice-badge-cat notice-badge-pinned flex items-center gap-1">
                      <Pin className="size-2.5" /> Pinned
                    </span>
                  )}
                  {!n.read && (
                    <span className="notice-badge-cat notice-badge-new">
                      New
                    </span>
                  )}
                </div>
                <p className="font-semibold leading-snug line-clamp-2 text-[var(--luxury-cream)]">
                  {n.title}
                </p>
                <p className="text-sm text-[var(--luxury-text-muted)] mt-1 line-clamp-2 leading-relaxed">
                  {n.description}
                </p>
                <p className="text-xs text-[var(--luxury-text-muted)] mt-3 flex items-center gap-1">
                  <Bell className="size-3" />
                  {formatRelativeTime(n.publishedAt)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <BannerAd slot="notices-list" />
      </div>

      {/* ===== DETAIL SHEET — premium ===== */}
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
              className="notice-detail-sheet relative w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 backdrop-blur-xl bg-[oklch(0.22_0.03_340_/_0.8)] border-b border-[var(--luxury-border)] px-6 py-4 flex items-center justify-between gap-4">
                <button
                  onClick={() => setSelected(null)}
                  className="notice-close-btn size-9 rounded-xl flex items-center justify-center"
                  aria-label="Back"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <span className={cn("notice-badge-cat", categoryBadgeClass[selected.category])}>
                  {selected.category}
                </span>
                <button
                  onClick={() => setSelected(null)}
                  className="notice-close-btn size-9 rounded-xl flex items-center justify-center ml-auto"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                <h2 className="text-xl font-bold tracking-tight text-[var(--luxury-cream)]">
                  {selected.title}
                </h2>
                <p className="text-xs text-[var(--luxury-text-muted)] mt-2">
                  Published {formatDate(selected.publishedAt)} · {formatRelativeTime(selected.publishedAt)}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-[var(--luxury-text)]/90">
                  {selected.description}
                </p>

                {/* Tags */}
                {selected.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    {selected.tags.map((t) => (
                      <span key={t} className="notice-tag">#{t}</span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-6">
                  {selected.pdfUrl && (
                    <a
                      href={selected.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="paper-btn-primary flex-1 h-10 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <FileText className="size-4" /> View PDF
                    </a>
                  )}
                  {selected.externalUrl && (
                    <a
                      href={selected.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="paper-btn-secondary flex-1 h-10 rounded-full text-sm font-medium flex items-center justify-center gap-2"
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
