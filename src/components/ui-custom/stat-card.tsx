"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  accent?: "plum" | "amber" | "mint" | "coral" | "lavender";
  variant?: "default" | "tinted" | "warm" | "paper";
}

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  plum: "text-primary bg-primary/10",
  amber: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
  mint: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
  coral: "text-rose-600 bg-rose-500/10 dark:text-rose-400",
  lavender: "text-[oklch(0.50_0.12_280)] dark:text-[oklch(0.72_0.10_280)] bg-[oklch(0.50_0.12_280/0.10)]",
};

const variantClass: Record<NonNullable<StatCardProps["variant"]>, string> = {
  default: "glass",
  tinted: "glass-tinted",
  warm: "glass-warm",
  paper: "card-warm",
};

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, label, value, icon, hint, accent = "plum", variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          variantClass[variant],
          "rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 hover:shadow-soft hover:-translate-y-0.5",
          className,
        )}
        {...props}
      >
        {icon && (
          <div
            className={cn(
              "size-11 rounded-xl flex items-center justify-center shrink-0",
              accentClasses[accent],
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 tabular-nums">
            {value}
          </p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
      </div>
    );
  },
);
StatCard.displayName = "StatCard";
