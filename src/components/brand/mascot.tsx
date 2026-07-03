"use client";

import { cn } from "@/lib/utils";

interface MascotProps {
  size?: number;
  mood?: "happy" | "thinking" | "celebrate" | "sad" | "wave" | "sleep" | "read";
  className?: string;
}

/**
 * KTU One mascot — "Kai", a friendly rounded character.
 * Premium sketch style: monochrome body with pastel accents.
 * Used in empty states, onboarding, success, support, offline and 404 screens.
 *
 * Moods:
 *   happy     — default smile
 *   thinking  — neutral mouth, looking up
 *   celebrate — closed eyes + big smile + sparkles
 *   sad       — frown, smaller eyes
 *   wave      — happy + arm raised
 *   sleep     — closed eyes + zzz
 *   read      — holding a book
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
          <stop offset="0%" stopColor="oklch(0.55 0.18 340)" />
          <stop offset="100%" stopColor="oklch(0.62 0.18 20)" />
        </linearGradient>
        <radialGradient id="mascot-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="oklch(0.65 0.18 20)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="oklch(0.65 0.18 20)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft ambient glow */}
      <circle cx="60" cy="60" r="58" fill="url(#mascot-glow)" />

      {/* Body — rounded blob with hand-drawn feel */}
      <path
        d="M60 18 C82 18 100 36 100 60 C100 84 82 102 60 102 C38 102 20 84 20 60 C20 36 38 18 60 18 Z"
        fill="url(#mascot-grad)"
      />

      {/* Cheeks — soft blush */}
      <circle cx="40" cy="68" r="6" fill="oklch(0.85 0.10 20)" fillOpacity="0.45" />
      <circle cx="80" cy="68" r="6" fill="oklch(0.85 0.10 20)" fillOpacity="0.45" />

      {/* Eyes — vary by mood */}
      {mood === "happy" && (
        <>
          <circle cx="48" cy="56" r="4.5" fill="white" />
          <circle cx="72" cy="56" r="4.5" fill="white" />
          <circle cx="49" cy="57" r="2" fill="oklch(0.22 0.015 290)" />
          <circle cx="73" cy="57" r="2" fill="oklch(0.22 0.015 290)" />
        </>
      )}
      {mood === "thinking" && (
        <>
          <circle cx="48" cy="56" r="4.5" fill="white" />
          <rect x="68" y="52" width="9" height="9" rx="2" fill="white" />
          <circle cx="49" cy="57" r="2" fill="oklch(0.22 0.015 290)" />
          <circle cx="73" cy="57" r="2" fill="oklch(0.22 0.015 290)" />
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
          <circle cx="48" cy="59" r="1.8" fill="oklch(0.22 0.015 290)" />
          <circle cx="72" cy="59" r="1.8" fill="oklch(0.22 0.015 290)" />
          {/* Tear drop */}
          <path d="M48 64 Q 47 70 48 73 Q 49 70 48 64 Z" fill="oklch(0.70 0.10 220)" />
        </>
      )}
      {mood === "wave" && (
        <>
          <circle cx="48" cy="56" r="4.5" fill="white" />
          <circle cx="72" cy="56" r="4.5" fill="white" />
          <circle cx="49" cy="57" r="2" fill="oklch(0.22 0.015 290)" />
          <circle cx="73" cy="57" r="2" fill="oklch(0.22 0.015 290)" />
        </>
      )}
      {mood === "sleep" && (
        <>
          {/* Closed eyes — curved lines */}
          <path d="M44 56 Q 48 60 52 56" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M68 56 Q 72 60 76 56" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Zzz */}
          <text x="80" y="38" fill="white" fontSize="10" fontWeight="600" fontFamily="serif">z</text>
          <text x="86" y="30" fill="white" fontSize="13" fontWeight="600" fontFamily="serif">z</text>
          <text x="94" y="22" fill="white" fontSize="16" fontWeight="600" fontFamily="serif">Z</text>
        </>
      )}
      {mood === "read" && (
        <>
          {/* Glasses for reading */}
          <circle cx="48" cy="56" r="5.5" stroke="white" strokeWidth="2" fill="none" />
          <circle cx="72" cy="56" r="5.5" stroke="white" strokeWidth="2" fill="none" />
          <line x1="53.5" y1="56" x2="66.5" y2="56" stroke="white" strokeWidth="2" />
          <circle cx="48" cy="56" r="2" fill="white" />
          <circle cx="72" cy="56" r="2" fill="white" />
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
      {mood === "sleep" && (
        <path d="M52 76 Q 58 80 64 76" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      )}
      {mood === "read" && (
        <path d="M52 75 Q 60 80 68 75" stroke="white" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      )}

      {/* Wave arm — for wave mood */}
      {mood === "wave" && (
        <path
          d="M92 38 Q 102 30 98 22"
          stroke="oklch(0.55 0.18 340)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Book — for read mood */}
      {mood === "read" && (
        <g>
          <rect x="44" y="86" width="32" height="10" rx="1.5" fill="oklch(0.70 0.13 70)" />
          <line x1="60" y1="86" x2="60" y2="96" stroke="oklch(0.55 0.18 340)" strokeWidth="1" />
          <line x1="48" y1="90" x2="56" y2="90" stroke="oklch(0.30 0.05 340)" strokeWidth="0.8" opacity="0.5" />
          <line x1="64" y1="90" x2="72" y2="90" stroke="oklch(0.30 0.05 340)" strokeWidth="0.8" opacity="0.5" />
        </g>
      )}

      {/* Sparkles for celebrate */}
      {mood === "celebrate" && (
        <>
          <path d="M30 30 L34 34 M34 30 L30 34" stroke="oklch(0.70 0.13 70)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M88 28 L92 32 M92 28 L88 32" stroke="oklch(0.70 0.13 70)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M100 50 L102 52 M102 50 L100 52" stroke="oklch(0.70 0.13 70)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}

      {/* Feet — soft ovals */}
      {mood !== "read" && (
        <>
          <ellipse cx="48" cy="100" rx="6" ry="3" fill="oklch(0.55 0.18 340)" fillOpacity="0.7" />
          <ellipse cx="72" cy="100" rx="6" ry="3" fill="oklch(0.55 0.18 340)" fillOpacity="0.7" />
        </>
      )}
    </svg>
  );
}
