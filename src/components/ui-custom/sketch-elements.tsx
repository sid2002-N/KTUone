"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * SketchElements — a small collection of hand-drawn SVG accents.
 * Use sparingly — 1-2 per screen, never more.
 * All elements are decorative (aria-hidden) and respect reduced motion.
 */

type SketchColor = "plum" | "coral" | "amber" | "mint" | "lavender";

const colorMap: Record<SketchColor, string> = {
  plum: "oklch(0.55 0.18 340)",
  coral: "oklch(0.65 0.18 20)",
  amber: "oklch(0.70 0.13 70)",
  mint: "oklch(0.65 0.11 155)",
  lavender: "oklch(0.60 0.12 280)",
};

interface SketchProps {
  className?: string;
  color?: SketchColor;
  size?: number;
}

/* Curved hand-drawn arrow — points up-right */
export function SketchArrow({ className, color = "coral", size = 48 }: SketchProps) {
  const c = colorMap[color];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("select-none", className)}
      aria-hidden="true"
    >
      <path
        d="M6 38 Q 18 30 24 22 T 40 8"
        stroke={c}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        style={{ strokeDasharray: 60, strokeDashoffset: 0 }}
      />
      <path
        d="M32 6 L 40 8 L 38 16"
        stroke={c}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/* Hand-drawn underline stroke */
export function SketchUnderline({ className, color = "coral", size = 80 }: SketchProps) {
  const c = colorMap[color];
  return (
    <svg
      width={size}
      height={size * 0.16}
      viewBox="0 0 80 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("select-none", className)}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        d="M3 8 Q 20 2 40 6 T 77 7"
        stroke={c}
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/* Sparkle — 4-pointed star */
export function SketchSparkle({ className, color = "amber", size = 16 }: SketchProps) {
  const c = colorMap[color];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("select-none", className)}
      aria-hidden="true"
    >
      <path
        d="M8 1 Q 9 6 15 8 Q 9 10 8 15 Q 7 10 1 8 Q 7 6 8 1 Z"
        fill={c}
      />
    </svg>
  );
}

/* Small 4-dot trail — for leading the eye */
export function SketchDotTrail({ className, color = "lavender", size = 24 }: SketchProps) {
  const c = colorMap[color];
  return (
    <svg
      width={size * 2}
      height={size}
      viewBox="0 0 48 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("select-none", className)}
      aria-hidden="true"
    >
      <circle cx="3" cy="6" r="2" fill={c} opacity="0.4" />
      <circle cx="14" cy="6" r="2" fill={c} opacity="0.6" />
      <circle cx="25" cy="6" r="2" fill={c} opacity="0.8" />
      <circle cx="36" cy="6" r="2.5" fill={c} />
    </svg>
  );
}

/* Tiny star (5-pointed) */
export function SketchStar({ className, color = "amber", size = 14 }: SketchProps) {
  const c = colorMap[color];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("select-none", className)}
      aria-hidden="true"
    >
      <path
        d="M7 1 L 8.4 5.2 L 13 5.5 L 9.3 8.3 L 10.5 13 L 7 10.4 L 3.5 13 L 4.7 8.3 L 1 5.5 L 5.6 5.2 Z"
        fill={c}
      />
    </svg>
  );
}

/* Curved connector — for connecting elements visually */
export function SketchCurve({ className, color = "plum", size = 60 }: SketchProps) {
  const c = colorMap[color];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("select-none", className)}
      aria-hidden="true"
    >
      <path
        d="M5 55 Q 15 20 55 5"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="3 5"
      />
    </svg>
  );
}

/* Floating particles — a cluster of small drifting dots */
export function FloatingParticles({
  className,
  count = 6,
  colors = ["amber", "coral", "lavender"],
}: {
  className?: string;
  count?: number;
  colors?: SketchColor[];
}) {
  const prefersReduced = useReducedMotion();
  const particles = Array.from({ length: count }).map((_, i) => {
    const colorKey = colors[i % colors.length]!;
    const color = colorMap[colorKey];
    // Deterministic positions to avoid hydration mismatch
    const positions = [
      { x: 8, y: 18, size: 4, delay: 0 },
      { x: 28, y: 60, size: 3, delay: 0.4 },
      { x: 52, y: 14, size: 5, delay: 0.8 },
      { x: 72, y: 70, size: 3, delay: 1.2 },
      { x: 88, y: 30, size: 4, delay: 1.6 },
      { x: 42, y: 38, size: 3, delay: 2.0 },
      { x: 16, y: 78, size: 4, delay: 2.4 },
      { x: 64, y: 88, size: 3, delay: 2.8 },
    ];
    const p = positions[i % positions.length]!;
    return { ...p, color };
  });

  return (
    <div
      className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
      aria-hidden="true"
    >
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: 0.6,
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={
            prefersReduced
              ? { opacity: 0.5 }
              : {
                  y: [0, -12, 0],
                  opacity: [0, 0.7, 0.2],
                }
          }
          transition={{
            duration: 4 + (i % 3),
            delay: p.delay,
            repeat: prefersReduced ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
