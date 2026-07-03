"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, Award, Target } from "lucide-react";
import { AnimatedCounter } from "@/components/ui-custom/animated-counter";
import { CircularProgress } from "@/components/ui-custom/circular-progress";

interface AcademicStatusCardProps {
  /** CGPA out of 10, or null if not authenticated / loading */
  cgpa: number | null;
  /** Total credits earned across all semesters */
  creditsEarned: number | null;
  /** Total credits attempted (for progress ring) */
  totalCredits: number | null;
  /** Target credits for the degree (typically 160 for B.Tech) */
  targetCredits?: number;
  isAuthenticated: boolean;
  onLoginClick?: () => void;
}

/**
 * AcademicStatusCard — the unified academic overview card.
 *
 * Premium dark-luxury surface showing 3 key metrics:
 *   1. CGPA (out of 10) with progress ring
 *   2. Percentage (out of 100) — CGPA × 10
 *   3. Total credits earned (out of target)
 *
 * When not authenticated, shows a login prompt instead of metrics.
 */
export function AcademicStatusCard({
  cgpa,
  creditsEarned,
  totalCredits,
  targetCredits = 160,
  isAuthenticated,
  onLoginClick,
}: AcademicStatusCardProps) {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  const percentage = cgpa !== null ? cgpa * 10 : null;
  const creditProgress =
    totalCredits && totalCredits > 0
      ? Math.min(100, ((creditsEarned ?? 0) / targetCredits) * 100)
      : 0;
  const cgpaProgress = cgpa !== null ? (cgpa / 10) * 100 : 0;

  return (
    <motion.div
      initial={mounted && !prefersReduced ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className="academic-status p-6 sm:p-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--luxury-text-muted)] font-medium">
            Academic Standing
          </p>
          <h3 className="font-serif text-xl text-[var(--luxury-cream)] mt-1">
            Your progress
          </h3>
        </div>
        <div className="size-10 rounded-xl bg-[oklch(0.62_0.15_340_/_0.15)] border border-[var(--luxury-border)] flex items-center justify-center">
          <TrendingUp className="size-5 text-[var(--luxury-plum)]" />
        </div>
      </div>

      {isAuthenticated ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-4">
          {/* CGPA with progress ring */}
          <div className="flex items-center gap-4 pb-5 sm:pb-0 sm:border-0 border-b border-[var(--luxury-border)]">
            <div className="progress-ring-premium shrink-0">
              <CircularProgress
                value={cgpaProgress}
                size={72}
                strokeWidth={6}
                color="var(--luxury-plum)"
                trackColor="oklch(1 0 0 / 0.06)"
              >
                <span className="text-[10px] font-bold text-[var(--luxury-text-muted)] uppercase tracking-wider">
                  CGPA
                </span>
              </CircularProgress>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[var(--luxury-text-muted)] font-medium mb-1">
                CGPA
              </p>
              <p className="metric-number text-3xl text-[var(--luxury-cream)]">
                {cgpa !== null ? (
                  <AnimatedCounter value={cgpa} decimals={2} />
                ) : (
                  <span className="text-base text-[var(--luxury-text-muted)]">—</span>
                )}
              </p>
              <p className="text-xs text-[var(--luxury-text-muted)] mt-0.5">out of 10</p>
            </div>
          </div>

          {/* Percentage */}
          <div className="flex items-center gap-4 py-5 sm:py-0 sm:border-l border-[var(--luxury-border)] sm:pl-4 border-b sm:border-b-0">
            <div className="size-12 rounded-xl bg-[oklch(0.78_0.13_75_/_0.12)] border border-[var(--luxury-border)] flex items-center justify-center shrink-0">
              <Award className="size-5 text-[var(--luxury-amber)]" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[var(--luxury-text-muted)] font-medium mb-1">
                Percentage
              </p>
              <p className="metric-number text-3xl text-[var(--luxury-cream)]">
                {percentage !== null ? (
                  <>
                    <AnimatedCounter value={percentage} decimals={1} />
                    <span className="text-lg text-[var(--luxury-text-muted)]">%</span>
                  </>
                ) : (
                  <span className="text-base text-[var(--luxury-text-muted)]">—</span>
                )}
              </p>
              <p className="text-xs text-[var(--luxury-text-muted)] mt-0.5">out of 100</p>
            </div>
          </div>

          {/* Credits earned */}
          <div className="flex items-center gap-4 pt-5 sm:pt-0 sm:border-l border-[var(--luxury-border)] sm:pl-4">
            <div className="size-12 rounded-xl bg-[oklch(0.68_0.13_45_/_0.12)] border border-[var(--luxury-border)] flex items-center justify-center shrink-0">
              <Target className="size-5 text-[var(--luxury-copper)]" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[var(--luxury-text-muted)] font-medium mb-1">
                Credits Earned
              </p>
              <p className="metric-number text-3xl text-[var(--luxury-cream)]">
                {creditsEarned !== null ? (
                  <AnimatedCounter value={creditsEarned} />
                ) : (
                  <span className="text-base text-[var(--luxury-text-muted)]">—</span>
                )}
              </p>
              <p className="text-xs text-[var(--luxury-text-muted)] mt-0.5">
                of {targetCredits} target · {creditProgress.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="text-sm text-[var(--luxury-text-muted)] mb-4">
            Sign in to see your CGPA, percentage and credits earned.
          </p>
          <button
            onClick={onLoginClick}
            className="btn-luxury px-5 py-2.5 rounded-full text-sm font-semibold"
          >
            Sign in
          </button>
        </div>
      )}
    </motion.div>
  );
}
