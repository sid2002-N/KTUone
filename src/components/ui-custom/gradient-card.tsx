"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GradientCardProps extends HTMLAttributes<HTMLDivElement> {
  gradient?: "plum" | "warm" | "tri";
  hover?: boolean;
}

export const GradientCard = forwardRef<HTMLDivElement, GradientCardProps>(
  ({ className, gradient = "plum", hover = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl text-white shadow-soft relative overflow-hidden",
          gradient === "plum" && "bg-gradient-plum",
          gradient === "warm" && "bg-gradient-warm",
          gradient === "tri" && "bg-gradient-tri",
          hover && "transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5",
          className,
        )}
        {...props}
      >
        {/* subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative">{children}</div>
      </div>
    );
  },
);
GradientCard.displayName = "GradientCard";
