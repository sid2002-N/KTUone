"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "strong" | "tinted" | "warm" | "paper" | "sketch" | "sketch-pencil" | "notebook";

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
  sketch: "sketch-border",
  "sketch-pencil": "sketch-pencil",
  notebook: "glass notebook-ruled",
};

/**
 * GlassCard — the primary surface across KTU One.
 * Use variants to introduce visual variety:
 *   - default:        standard frosted glass (most cards)
 *   - strong:         higher opacity, for modals & overlays
 *   - tinted:         lavender-tinted glass (stat cards, secondary)
 *   - warm:           peach-tinted glass (callouts, support banners)
 *   - paper:          opaque warm-white card (editorial, formal)
 *   - sketch:         hand-drawn wavy border overlay
 *   - sketch-pencil:  dashed pencil-style border
 *   - notebook:       glass with notebook ruled-line texture
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
