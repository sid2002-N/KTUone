/**
 * Generate 192×192 and 512×512 PNG icons from logo.svg.
 * Run: npx tsx scripts/generate-icons.ts
 */
import sharp from "sharp";
import { readFileSync } from "fs";

async function main() {
  const svgBuffer = readFileSync("public/logo.svg");

  // 192×192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile("public/icon-192.png");
  console.log("✅ Generated public/icon-192.png (192×192)");

  // 512×512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile("public/icon-512.png");
  console.log("✅ Generated public/icon-512.png (512×512)");
}

main().catch(console.error);
