"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  illustration?: React.ReactNode;
  /** Optional handwritten accent shown above the title (e.g. "oops!", "psst…") */
  accent?: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  compact?: boolean;
}

/**
 * EmptyState — premium editorial empty state with delightful messaging.
 *
 * Features:
 * - Dark luxury surface with radial glow + dotted texture
 * - Floating decorative orbs (plum + amber) for depth
 * - Optional handwritten accent text above the title
 * - Serif title + muted description
 * - Premium gradient primary button + glass outline secondary
 *
 * The `illustration` prop should be a sketch icon (SketchBooks, SketchNotebook, etc.)
 * The `accent` prop is a short handwritten phrase like "oops!", "psst…", "hey there"
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      title,
      description,
      illustration,
      accent,
      primaryAction,
      secondaryAction,
      compact = false,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "empty-state-premium flex flex-col items-center justify-center text-center relative",
          compact ? "py-8 px-4" : "py-16 px-6",
          className,
        )}
        {...props}
      >
        {/* Decorative floating orbs */}
        <div
          className="empty-state-orb size-32 bg-[oklch(0.62_0.15_340)]"
          style={{ top: "-20px", left: "-20px" }}
        />
        <div
          className="empty-state-orb size-24 bg-[oklch(0.78_0.13_75)]"
          style={{ bottom: "-15px", right: "-15px" }}
        />

        <div className="relative z-10 flex flex-col items-center">
          {/* Illustration */}
          {illustration && (
            <div className={cn("empty-illustration", compact ? "mb-3" : "mb-6")}>
              {illustration}
            </div>
          )}

          {/* Handwritten accent */}
          {accent && (
            <p className={cn("empty-handwritten", compact ? "mb-1" : "mb-2")}>
              {accent}
            </p>
          )}

          {/* Title */}
          <h3
            className={cn(
              "empty-title-premium",
              compact ? "text-base" : "text-xl sm:text-2xl",
            )}
          >
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p
              className={cn(
                "empty-desc-premium mt-2",
                compact ? "text-xs" : "text-sm",
              )}
            >
              {description}
            </p>
          )}

          {/* Actions */}
          {(primaryAction || secondaryAction) && (
            <div className="flex items-center gap-3 mt-6 flex-wrap justify-center">
              {primaryAction && (
                <button
                  onClick={primaryAction.onClick}
                  className="empty-btn-primary px-5 py-2.5 rounded-full text-sm font-semibold"
                >
                  {primaryAction.label}
                </button>
              )}
              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className="empty-btn-secondary px-5 py-2.5 rounded-full text-sm font-medium"
                >
                  {secondaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);
EmptyState.displayName = "EmptyState";
