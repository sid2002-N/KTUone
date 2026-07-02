"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  illustration?: React.ReactNode;
  /** Kept for backward compatibility but no longer rendered as handwritten.
   *  Plain useful subtext is preferred over playful microcopy. */
  accent?: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  compact?: boolean;
}

/**
 * EmptyState — quiet, clear, single action.
 *
 * No playful microcopy. No cursive accents. Just a plain title, useful
 * subtext, and exactly one clear action. The illustration is optional.
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      title,
      description,
      illustration,
      accent: _accent,
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
          "empty-state flex flex-col items-center justify-center text-center",
          compact ? "py-8 px-4" : "py-16 px-6",
          className,
        )}
        {...props}
      >
        {illustration && (
          <div className={cn(compact ? "mb-3" : "mb-5 opacity-70")}>{illustration}</div>
        )}
        <h3 className={cn("section-title", compact ? "text-base" : "text-lg")}>
          {title}
        </h3>
        {description && (
          <p className={cn("text-sm text-muted-foreground mt-2 max-w-sm", compact ? "text-xs" : "")}>
            {description}
          </p>
        )}
        {(primaryAction || secondaryAction) && (
          <div className="flex items-center gap-3 mt-5 flex-wrap justify-center">
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                className="btn-primary px-5 py-2.5 rounded-md text-sm font-semibold"
              >
                {primaryAction.label}
              </button>
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="btn-ghost px-5 py-2.5 rounded-md text-sm font-medium"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);
EmptyState.displayName = "EmptyState";
