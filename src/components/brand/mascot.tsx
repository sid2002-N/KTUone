"use client";

import { cn } from "@/lib/utils";

interface MascotProps {
  size?: number;
  mood?: "happy" | "thinking" | "celebrate" | "sad" | "wave";
  className?: string;
}

/**
 * KTU One mascot — "Kai", a friendly rounded character.
 * Minimal, geometric, never childish. Used in empty states, onboarding,
 * success, support, offline and 404 screens.
 */
export function Mascot({ size = 120, mood = "happy", className }: MascotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mascot-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--gradient-1)" />
          <stop offset="100%" stopColor="var(--gradient-2)" />
        </linearGradient>
        <radialGradient id="mascot-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--gradient-1)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--gradient-1)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft glow */}
      <circle cx="60" cy="60" r="58" fill="url(#mascot-glow)" />

      {/* Body — rounded blob */}
      <path
        d="M60 18 C82 18 100 36 100 60 C100 84 82 102 60 102 C38 102 20 84 20 60 C20 36 38 18 60 18 Z"
        fill="url(#mascot-grad)"
      />

      {/* Cheeks */}
      <circle cx="40" cy="68" r="6" fill="#fff" fillOpacity="0.18" />
      <circle cx="80" cy="68" r="6" fill="#fff" fillOpacity="0.18" />

      {/* Eyes */}
      {mood === "happy" && (
        <>
          <circle cx="48" cy="56" r="4.5" fill="white" />
          <circle cx="72" cy="56" r="4.5" fill="white" />
          <circle cx="49" cy="57" r="2" fill="#1a1620" />
          <circle cx="73" cy="57" r="2" fill="#1a1620" />
        </>
      )}
      {mood === "thinking" && (
        <>
          <circle cx="48" cy="56" r="4.5" fill="white" />
          <rect x="68" y="52" width="9" height="9" rx="2" fill="white" />
          <circle cx="49" cy="57" r="2" fill="#1a1620" />
          <circle cx="73" cy="57" r="2" fill="#1a1620" />
        </>
      )}
      {mood === "celebrate" && (
        <>
          <path d="M44 56 Q48 50 52 56" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M68 56 Q72 50 76 56" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      )}
      {mood === "sad" && (
        <>
          <circle cx="48" cy="58" r="4" fill="white" />
          <circle cx="72" cy="58" r="4" fill="white" />
          <circle cx="48" cy="59" r="1.8" fill="#1a1620" />
          <circle cx="72" cy="59" r="1.8" fill="#1a1620" />
        </>
      )}
      {mood === "wave" && (
        <>
          <circle cx="48" cy="56" r="4.5" fill="white" />
          <circle cx="72" cy="56" r="4.5" fill="white" />
          <circle cx="49" cy="57" r="2" fill="#1a1620" />
          <circle cx="73" cy="57" r="2" fill="#1a1620" />
        </>
      )}

      {/* Mouth */}
      {mood === "happy" && (
        <path d="M50 74 Q60 82 70 74" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      {mood === "thinking" && (
        <path d="M54 76 L66 76" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      {mood === "celebrate" && (
        <path d="M48 72 Q60 86 72 72" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      )}
      {mood === "sad" && (
        <path d="M50 80 Q60 72 70 80" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      {mood === "wave" && (
        <path d="M50 74 Q60 80 70 74" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}

      {/* Wave arm */}
      {mood === "wave" && (
        <path
          d="M92 38 Q102 30 98 22"
          stroke="var(--gradient-1)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Sparkles for celebrate */}
      {mood === "celebrate" && (
        <>
          <path d="M30 30 L34 34 M34 30 L30 34" stroke="var(--gradient-3)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M88 28 L92 32 M92 28 L88 32" stroke="var(--gradient-3)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M100 50 L102 52 M102 50 L100 52" stroke="var(--gradient-3)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}

      {/* Feet */}
      <ellipse cx="48" cy="100" rx="6" ry="3" fill="var(--gradient-1)" fillOpacity="0.7" />
      <ellipse cx="72" cy="100" rx="6" ry="3" fill="var(--gradient-1)" fillOpacity="0.7" />
    </svg>
  );
}
