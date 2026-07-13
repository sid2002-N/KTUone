/**
 * Generate favicon files from logo.svg.
 * Creates: favicon.ico (32×32), apple-touch-icon.png (180×180)
 * Run: npx tsx scripts/generate-favicon.ts
 */
import sharp from "sharp";
import { readFileSync } from "fs";

async function main() {
  const svgBuffer = readFileSync("public/logo.svg");

  // favicon.ico — 32×32 (browsers use this in the tab)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile("public/favicon-32.png");
  console.log("✅ Generated public/favicon-32.png (32×32)");

  // Also generate a 16×16 for older browsers
  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile("public/favicon-16.png");
  console.log("✅ Generated public/favicon-16.png (16×16)");

  // apple-touch-icon.png — 180×180 (iOS home screen)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile("public/apple-touch-icon.png");
  console.log("✅ Generated public/apple-touch-icon.png (180×180)");

  // favicon.ico — combine 16+32 into ICO format
  // sharp can't write .ico directly, so we use a different approach:
  // Write the 32x32 as favicon.ico (most browsers accept PNG with .ico extension)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile("public/favicon.ico");
  console.log("✅ Generated public/favicon.ico (32×32 PNG, accepted as ICO)");
}

main().catch(console.error);
