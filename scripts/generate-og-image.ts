/**
 * Generate a branded OG image for KTU One (1200×630 PNG).
 *
 * Design:
 * - Dark charcoal background (#111315)
 * - Amber accent bar on left edge
 * - "KTU One" in serif font
 * - Tagline: "Student Companion for APJ Abdul Kalam Technological University"
 * - Small "K" logo mark in amber
 *
 * Run: npx tsx scripts/generate-og-image.ts
 */
import sharp from "sharp";
import { Source_Serif_4, Inter } from "next/font/google";

// We can't use next/font in a script context, so we'll use SVG text
// with system fonts that closely match (Georgia for serif, sans-serif for body)
// and render via sharp's SVG input.

const WIDTH = 1200;
const HEIGHT = 630;
const BG = "#111315";
const AMBER = "#D4943A";
const TEXT = "#E8E6E1";
const MUTED = "#8B8881";

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>

  <!-- Amber accent bar on left -->
  <rect x="0" y="0" width="8" height="${HEIGHT}" fill="${AMBER}"/>

  <!-- Top highlight -->
  <rect x="0" y="0" width="${WIDTH}" height="1" fill="rgba(255,255,255,0.06)"/>

  <!-- "K" logo mark -->
  <rect x="80" y="80" width="72" height="72" rx="16" fill="${AMBER}"/>
  <text x="116" y="132" font-family="Georgia, serif" font-size="42" font-weight="600" fill="${BG}" text-anchor="middle">K</text>

  <!-- "KTU One" heading -->
  <text x="180" y="120" font-family="Georgia, serif" font-size="32" font-weight="500" fill="${TEXT}">KTU One</text>
  <text x="180" y="150" font-family="sans-serif" font-size="16" fill="${MUTED}">Student companion</text>

  <!-- Main headline -->
  <text x="80" y="300" font-family="Georgia, serif" font-size="64" font-weight="600" fill="${TEXT}">Your academic day,</text>
  <text x="80" y="380" font-family="Georgia, serif" font-size="64" font-weight="600" fill="${AMBER}" font-style="italic">sorted.</text>

  <!-- Tagline -->
  <text x="80" y="450" font-family="sans-serif" font-size="22" fill="${MUTED}">Calculators · Question Papers · Syllabus · Notices · Calendar</text>

  <!-- University name -->
  <text x="80" y="530" font-family="sans-serif" font-size="16" fill="${MUTED}">For APJ Abdul Kalam Technological University students</text>

  <!-- Bottom amber line -->
  <rect x="80" y="570" width="200" height="2" fill="${AMBER}" opacity="0.4"/>
</svg>
`;

async function main() {
  const outputPath = "public/og-default.png";
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  console.log(`✅ OG image generated: ${outputPath} (${WIDTH}×${HEIGHT})`);
}

main().catch(console.error);
