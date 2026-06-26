"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardVariant =
  | "default"
  | "strong"
  | "tinted"
  | "warm"
  | "paper"
  | "sketch"
  | "sketch-pencil"
  | "notebook"
  | "index"
  | "kraft"
  | "lined"
  | "magazine";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hover?: boolean;
  float?: boolean;
  as?: "div" | "section" | "article" | "aside";
}

const variantClass: Record<CardVariant, string> = {
  default: "paper-card",       // v3: paper-card is the new default — drawn border, paper texture
  strong: "glass-strong",      // kept for modals/overlays where translucency matters
  tinted: "glass-tinted",
  warm: "glass-warm",
  paper: "paper-card",
  sketch: "sketch-border",
  "sketch-pencil": "sketch-pencil",
  notebook: "lined-page",
  index: "index-card",
  kraft: "kraft-card",
  lined: "lined-page",
  magazine: "magazine-card",
};

/**
 * GlassCard — primary surface across KTU One (v3).
 *
 * The DEFAULT variant is now `paper-card`: a warm cream paper background with
 * a hand-drawn double-stroke border (offset shadow) and subtle paper grain.
 * This is the notebook/sketchbook aesthetic — not a SaaS card.
 *
 * Variants for variety:
 *   - default / paper:    warm paper card with drawn border (USE THIS FOR MOST CARDS)
 *   - index:              index card with red top rule (for stat-style cards)
 *   - kraft:              brown kraft paper (for warm/editorial blocks)
 *   - lined / notebook:   notebook ruled paper with red margin line
 *   - magazine:           crisp editorial card (for formal content)
 *   - strong:             frosted glass (modals/overlays only)
 *   - tinted / warm:      tinted glass (for accents)
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", hover = false, float = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          variantClass[variant],
          "rounded-2xl",
          hover && "paper-card-hover",
          float && "float-subtle",
          className,
        )}
        {...props}
      >
        <div className="relative z-10">{children}</div>
      </div>
    );
  },
);
GlassCard.displayName = "GlassCard";
