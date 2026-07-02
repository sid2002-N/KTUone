/**
 * KTU One — Database seed script (reference data only).
 *
 * Seeds ONLY curated reference data: branches, semesters, and the default
 * app-settings row. Real content (papers, syllabus, notices, calendar events,
 * timetables) is added by admins via /admin after deployment — that is the
 * intended production flow, so this seed deliberately does NOT fabricate any
 * fake content.
 *
 * Run with: bun run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { BRANCHES, SEMESTERS } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding KTU One reference data…");

  // 1. Branches — the canonical KTU branch list.
  console.log("  → Branches");
  for (const b of BRANCHES) {
    await prisma.branch.upsert({
      where: { code: b.code },
      update: { name: b.name, fullName: b.fullName },
      create: { code: b.code, name: b.name, fullName: b.fullName },
    });
  }

  // 2. Semesters — one row per (branch × semester × academic year).
  console.log("  → Semesters");
  const academicYear = "2025-2026";
  for (const branch of BRANCHES) {
    for (const num of SEMESTERS) {
      await prisma.semester.upsert({
        where: {
          number_branchCode_academicYear: {
            number: num,
            branchCode: branch.code,
            academicYear,
          },
        },
        update: {},
        create: {
          number: num,
          branchCode: branch.code,
          academicYear,
          totalCredits: 24,
        },
      });
    }
  }

  // 3. App settings — single seed row used to bootstrap the settings table.
  console.log("  → App settings");
  await prisma.appSettings.upsert({
    where: { key: "app.version" },
    update: {},
    create: { key: "app.version", value: JSON.stringify("1.0.0-alpha") },
  });

  console.log("✅ Seed complete");
  console.log(`   ${BRANCHES.length} branches`);
  console.log(`   ${BRANCHES.length * SEMESTERS.length} semesters (${academicYear})`);
  console.log("   0 papers / syllabus / notices / calendar / timetables — add via /admin");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
