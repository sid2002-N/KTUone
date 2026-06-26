"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "strong" | "tinted" | "warm" | "paper";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hover?: boolean;
  float?: boolean;
  as?: "div" | "section" | "article" | "aside";
}

const variantClass: Record<CardVariant, string> = {
  default: "glass",
  strong: "glass-strong",
  tinted: "glass-tinted",
  warm: "glass-warm",
  paper: "card-warm",
};

/**
 * GlassCard — the primary surface across KTU One.
 * Use variants to introduce visual variety:
 *   - default:  standard frosted glass (most cards)
 *   - strong:   higher opacity, for modals & overlays
 *   - tinted:   lavender-tinted glass (stat cards, secondary)
 *   - warm:     peach-tinted glass (callouts, support banners)
 *   - paper:    opaque warm-white card (editorial, formal)
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", hover = false, float = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          variantClass[variant],
          "rounded-2xl",
          hover && "transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5",
          float && "float-subtle",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
GlassCard.displayName = "GlassCard";
