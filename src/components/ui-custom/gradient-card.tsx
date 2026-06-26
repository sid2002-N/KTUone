"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GradientCardProps extends HTMLAttributes<HTMLDivElement> {
  gradient?: "plum" | "warm" | "tri" | "lavender";
  hover?: boolean;
  float?: boolean;
}

/**
 * GradientCard — premium gradient surface for hero, support banner, results.
 * Always paired with white text. Adds subtle decorative glow + grain.
 */
export const GradientCard = forwardRef<HTMLDivElement, GradientCardProps>(
  ({ className, gradient = "plum", hover = false, float = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl text-white shadow-soft relative overflow-hidden",
          gradient === "plum" && "bg-gradient-plum",
          gradient === "warm" && "bg-gradient-warm",
          gradient === "tri" && "bg-gradient-tri",
          gradient === "lavender" && "bg-gradient-lavender",
          hover && "transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5",
          float && "float-subtle",
          className,
        )}
        {...props}
      >
        {/* Subtle decorative glow — upper right */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        {/* Soft warm underglow — lower left */}
        <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        {/* Hairline top highlight — gives "fabric" feel */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
        <div className="relative">{children}</div>
      </div>
    );
  },
);
GradientCard.displayName = "GradientCard";
