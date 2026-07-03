/**
 * One-time cleanup script for scraper-synced notices.
 *
 * Cleans HTML entities + tags from existing notice titles + descriptions
 * in the database. Only touches notices where `key` does NOT start with
 * "admin-" (scraper notices only — admin notices are never touched).
 *
 * Usage:
 *   npx tsx scripts/clean-scraper-notices.ts --dry-run    # Preview only, writes diff to file
 *   npx tsx scripts/clean-scraper-notices.ts               # Live run with confirmation
 *
 * The dry-run writes a diff file to /home/z/my-project/download/notice-cleanup-diff.txt
 * so you can review the before/after for every notice.
 *
 * Re-running on already-clean text is a no-op — cleanScraperText() detects
 * when input has no HTML entities/tags and returns it unchanged.
 */
import { PrismaClient } from "@prisma/client";
import { cleanScraperText, cleanScraperTitle } from "../src/lib/utils/clean-text";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const DIFF_FILE = "/home/z/my-project/download/notice-cleanup-diff.txt";

async function main() {
  console.log("=".repeat(60));
  console.log(`Notice Cleanup Script — ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE RUN"}`);
  console.log("=".repeat(60));

  // Fetch ALL notices where key does NOT start with "admin-"
  // These are scraper-synced notices that may contain HTML.
  const notices = await prisma.kTUNotice.findMany({
    where: {
      key: { not: { startsWith: "admin-" } },
    },
    select: { id: true, key: true, title: true, description: true },
    orderBy: { publishedAt: "desc" },
  });

  console.log(`\nFound ${notices.length} scraper-synced notices to check.\n`);

  let needsUpdate = 0;
  let alreadyClean = 0;
  const diffs: string[] = [];

  for (const n of notices) {
    const cleanTitle = cleanScraperTitle(n.title);
    const cleanDesc = cleanScraperText(n.description);

    const titleChanged = cleanTitle !== n.title;
    const descChanged = cleanDesc !== n.description;

    if (!titleChanged && !descChanged) {
      alreadyClean++;
      continue;
    }

    needsUpdate++;

    // Build diff entry
    diffs.push(
      `${"─".repeat(60)}\n` +
      `ID: ${n.id}\n` +
      `Key: ${n.key}\n\n` +
      `TITLE BEFORE: ${n.title}\n` +
      `TITLE AFTER:  ${cleanTitle}\n` +
      `Title changed: ${titleChanged ? "YES" : "no"}\n\n` +
      `DESCRIPTION BEFORE: ${n.description?.slice(0, 500) ?? "(empty)"}${(n.description?.length ?? 0) > 500 ? "..." : ""}\n` +
      `DESCRIPTION AFTER:  ${cleanDesc?.slice(0, 500) ?? "(empty)"}${cleanDesc.length > 500 ? "..." : ""}\n` +
      `Description changed: ${descChanged ? "YES" : "no"}\n`
    );

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would update: ${n.key}`);
      console.log(`    Title: ${titleChanged ? "CHANGED" : "same"}`);
      console.log(`    Desc:  ${descChanged ? "CHANGED" : "same"}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`RESULTS:`);
  console.log(`  Total scraper notices: ${notices.length}`);
  console.log(`  Needs update: ${needsUpdate}`);
  console.log(`  Already clean (no-op): ${alreadyClean}`);

  if (diffs.length === 0) {
    console.log(`\n✅ All notices are already clean — no changes needed.`);
    return;
  }

  // Write diff to file
  const fs = await import("fs");
  const diffContent = `Notice Cleanup Diff — ${new Date().toISOString()}\n` +
    `Mode: ${DRY_RUN ? "DRY RUN" : "LIVE RUN"}\n` +
    `Notices needing update: ${needsUpdate}\n` +
    `Notices already clean: ${alreadyClean}\n\n` +
    diffs.join("\n");

  fs.writeFileSync(DIFF_FILE, diffContent);
  console.log(`\n📄 Diff written to: ${DIFF_FILE}`);

  if (DRY_RUN) {
    console.log(`\nThis was a DRY RUN — no database changes were made.`);
    console.log(`Review the diff file, then run without --dry-run to apply.`);
    return;
  }

  // LIVE RUN — ask for confirmation
  console.log(`\n⚠️  ABOUT TO UPDATE ${needsUpdate} NOTICES IN THE DATABASE.`);
  console.log(`This will modify titles and descriptions of scraper-synced notices only.`);
  console.log(`Admin notices are NOT touched.\n`);

  // In non-interactive mode (script), proceed if --force is passed
  const force = process.argv.includes("--force");
  if (!force) {
    console.log(`Add --force to proceed: npx tsx scripts/clean-scraper-notices.ts --force`);
    return;
  }

  console.log("Applying changes...");

  let updated = 0;
  for (const n of notices) {
    const cleanTitle = cleanScraperTitle(n.title);
    const cleanDesc = cleanScraperText(n.description);

    if (cleanTitle === n.title && cleanDesc === n.description) continue;

    await prisma.kTUNotice.update({
      where: { id: n.id },
      data: { title: cleanTitle, description: cleanDesc },
    });
    updated++;
  }

  console.log(`\n✅ Updated ${updated} notices.`);
}

main()
  .catch((e) => {
    console.error("❌ Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
