#!/usr/bin/env python3
"""
Generate a custom KTU One favicon set (replacing the default ZAI icon).

Design:
  - 512x512 viewBox
  - Rounded square background in deep charcoal (#111315) — matches app bg
  - Bold geometric "K" letterform in warm amber (#D4943A) — matches --primary
  - Subtle inner highlight on the K stroke for depth
  - Small graduation-cap accent dot at the top-right of the K — academic theme

Outputs (into /home/z/my-project/public/):
  - favicon.svg         (source SVG, also used by Safari / modern browsers)
  - favicon-16.png
  - favicon-32.png
  - apple-touch-icon.png (180x180)
  - icon-192.png
  - icon-512.png
  - favicon.ico         (multi-size ICO wrapping favicon-32.png)
  - logo.svg            (replaces the old ZAI logo — used in the header)
"""

from pathlib import Path
import struct
import zlib

import cairosvg

PUBLIC_DIR = Path("/home/z/my-project/public")
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. Source SVG  (512x512 viewBox)
# ---------------------------------------------------------------------------

SVG = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1A1D20"/>
      <stop offset="100%" stop-color="#0E1012"/>
    </linearGradient>
    <linearGradient id="kGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#E8A84D"/>
      <stop offset="100%" stop-color="#B8762E"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
      <feOffset dx="0" dy="6" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.35"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Rounded square background -->
  <rect x="16" y="16" width="480" height="480" rx="112" ry="112"
        fill="url(#bgGrad)"/>

  <!-- Subtle inner border for premium feel -->
  <rect x="16" y="16" width="480" height="480" rx="112" ry="112"
        fill="none" stroke="#2A2D31" stroke-width="2"/>

  <!-- K letterform (geometric, two strokes meeting at the centre) -->
  <g filter="url(#softShadow)">
    <!-- Vertical stem -->
    <path d="M 168 128 L 168 384 L 216 384 L 216 128 Z"
          fill="url(#kGrad)"/>
    <!-- Upper diagonal -->
    <path d="M 216 256 L 320 128 L 380 128 L 256 280 Z"
          fill="url(#kGrad)"/>
    <!-- Lower diagonal -->
    <path d="M 216 256 L 256 232 L 380 384 L 320 384 Z"
          fill="url(#kGrad)"/>
  </g>

  <!-- Highlight stripe on the stem (depth) -->
  <path d="M 178 138 L 178 374 L 196 374 L 196 138 Z"
        fill="#FFFFFF" opacity="0.18"/>

  <!-- Graduation cap accent (top-right corner — academic theme) -->
  <g transform="translate(352 96) scale(1.0)">
    <!-- Mortarboard cap -->
    <path d="M 0 18 L 48 0 L 96 18 L 48 36 Z"
          fill="#D4943A"/>
    <!-- Cap base (trapezoid) -->
    <path d="M 24 30 L 24 50 Q 48 60 72 50 L 72 30 Z"
          fill="#B8762E"/>
    <!-- Tassel -->
    <path d="M 84 22 L 84 56"
          stroke="#D4943A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="84" cy="60" r="4" fill="#D4943A"/>
  </g>
</svg>
"""

# Save source SVG (used by modern browsers as favicon.svg)
(PUBLIC_DIR / "favicon.svg").write_text(SVG, encoding="utf-8")

# Replace logo.svg too (used by the in-app header) — same design, no animation
(PUBLIC_DIR / "logo.svg").write_text(SVG, encoding="utf-8")

# ---------------------------------------------------------------------------
# 2. Render PNGs at all required sizes
# ---------------------------------------------------------------------------

SIZES = {
    "favicon-16.png": 16,
    "favicon-32.png": 32,
    "apple-touch-icon.png": 180,
    "icon-192.png": 192,
    "icon-512.png": 512,
}

for name, size in SIZES.items():
    out = PUBLIC_DIR / name
    cairosvg.svg2png(
        bytestring=SVG.encode("utf-8"),
        write_to=str(out),
        output_width=size,
        output_height=size,
    )
    print(f"  wrote {out} ({size}x{size})")

# ---------------------------------------------------------------------------
# 3. Build favicon.ico (wraps favicon-32.png as a single 32x32 entry)
#    ICO format: 6-byte header + 16-byte directory entry + PNG payload
# ---------------------------------------------------------------------------

png32 = (PUBLIC_DIR / "favicon-32.png").read_bytes()

ico_header = struct.pack("<HHH", 0, 1, 1)  # reserved, type=1 (icon), count=1
ico_dir = struct.pack(
    "<BBBBHHII",
    32, 32,              # width, height (0 = 256)
    0,                   # color count (0 = no palette)
    0,                   # reserved
    1,                   # planes
    32,                  # bits per pixel
    len(png32),          # size of image data
    6 + 16,              # offset to image data
)
ico = ico_header + ico_dir + png32

(PUBLIC_DIR / "favicon.ico").write_bytes(ico)
print(f"  wrote {PUBLIC_DIR / 'favicon.ico'} ({len(ico)} bytes)")

print("\nDone. All favicon assets regenerated with the custom KTU One mark.")
