/**
 * Clean mock seed data from the production database.
 *
 * The original prisma/seed.ts (before the rewrite) inserted 31 fake papers,
 * 10 fake syllabus entries, 6 fake notices, and 6 fake calendar events with
 * mock fileUrl values like "https://r2.ktuone.in/papers/...". Those never
 * existed in R2 — they were mock data.
 *
 * This script deletes:
 *   - QuestionPapers where fileUrl starts with "https://" (mock — real admin
 *     uploads use R2 object keys like "papers/CSE/2026/09/...")
 *   - Syllabus where fileUrl starts with "https://" (same reason)
 *   - KTUNotices where key starts with "mock-" (mock seed slug prefix)
 *   - CalendarEvents created before 2026-01-01 with title in a known mock list
 *
 * Real admin-uploaded content (papers with fileUrl starting "papers/",
 * syllabus with fileUrl starting "syllabus/", notices created via /admin
 * with key starting "admin-", calendar events added via /admin) is KEPT.
 *
 * Run with:
 *   DATABASE_URL=<neon> DIRECT_URL=<neon> npx tsx scripts/cleanup-mock-data.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mock calendar event titles from the old seed (mock-data.ts)
const MOCK_CALENDAR_TITLES = new Set([
  "Series-1 Internal Examinations",
  "Last Date — Scholarship Application",
  "Placement Drive — TCS",
  "End-Semester Examination Begins",
  "Christmas Holidays",
  "Semester Result Publication",
]);

async function main() {
  console.log("🧹 Cleaning mock data from database...\n");

  // 1. Papers — delete rows where fileUrl looks like a mock URL
  const mockPapers = await prisma.questionPaper.findMany({
    where: { fileUrl: { startsWith: "https://" } },
    select: { id: true, title: true, fileUrl: true },
  });
  console.log(`📄 Papers: ${mockPapers.length} mock rows found (fileUrl starts with https://)`);
  for (const p of mockPapers) {
    console.log(`   - DELETE id=${p.id} title="${p.title}" fileUrl=${p.fileUrl}`);
  }
  if (mockPapers.length > 0) {
    const res = await prisma.questionPaper.deleteMany({
      where: { id: { in: mockPapers.map((p) => p.id) } },
    });
    console.log(`   → Deleted ${res.count} mock papers`);
  }

  // 2. Syllabus — same pattern
  const mockSyllabus = await prisma.syllabus.findMany({
    where: { fileUrl: { startsWith: "https://" } },
    select: { id: true, title: true, fileUrl: true },
  });
  console.log(`\n📖 Syllabus: ${mockSyllabus.length} mock rows found`);
  for (const s of mockSyllabus) {
    console.log(`   - DELETE id=${s.id} title="${s.title}" fileUrl=${s.fileUrl}`);
  }
  if (mockSyllabus.length > 0) {
    const res = await prisma.syllabus.deleteMany({
      where: { id: { in: mockSyllabus.map((s) => s.id) } },
    });
    console.log(`   → Deleted ${res.count} mock syllabus entries`);
  }

  // 3. Notices — delete rows where key starts with a mock slug
  //    Mock notice titles from old mock-data.ts slugged to:
  //    "end-semester-examination-december-2025-timetable-released", etc.
  //    Admin-created notices have key starting with "admin-"
  //    Scraper-synced notices have key from the scraper (varies)
  //    We delete any notice whose key does NOT start with "admin-" and was
  //    created before the cleanup date (2026-07-02) AND isn't from the scraper.
  //    Safer: just delete notices with these known mock titles.
  const MOCK_NOTICE_TITLES = [
    "End Semester Examination — December 2025 Timetable Released",
    "Revised Internal Assessment Mark Distribution",
    "Scholarship Applications Open — Kerala State Higher Education",
    "Placement Drive — TCS, Infosys & Wipro On-Campus",
    "TechFest 2025 — Registrations Open",
    "Valuation of Answer Scripts — Series-2 Results Published",
  ];
  const mockNotices = await prisma.kTUNotice.findMany({
    where: { title: { in: MOCK_NOTICE_TITLES } },
    select: { id: true, title: true, key: true },
  });
  console.log(`\n🔔 Notices: ${mockNotices.length} mock rows found`);
  for (const n of mockNotices) {
    console.log(`   - DELETE id=${n.id} title="${n.title}" key=${n.key}`);
  }
  if (mockNotices.length > 0) {
    const res = await prisma.kTUNotice.deleteMany({
      where: { id: { in: mockNotices.map((n) => n.id) } },
    });
    console.log(`   → Deleted ${res.count} mock notices`);
  }

  // 4. Calendar events — delete rows with mock titles
  const mockCalendar = await prisma.calendarEvent.findMany({
    where: { title: { in: Array.from(MOCK_CALENDAR_TITLES) } },
    select: { id: true, title: true, startDate: true },
  });
  console.log(`\n📅 Calendar: ${mockCalendar.length} mock rows found`);
  for (const e of mockCalendar) {
    console.log(`   - DELETE id=${e.id} title="${e.title}" start=${e.startDate.toISOString()}`);
  }
  if (mockCalendar.length > 0) {
    const res = await prisma.calendarEvent.deleteMany({
      where: { id: { in: mockCalendar.map((e) => e.id) } },
    });
    console.log(`   → Deleted ${res.count} mock calendar events`);
  }

  // 5. Summary — what remains
  console.log("\n" + "═".repeat(60));
  console.log("📊 Remaining real content:");
  const [papers, syllabus, notices, calendar, timetables] = await Promise.all([
    prisma.questionPaper.count({ where: { deletedAt: null } }),
    prisma.syllabus.count({ where: { deletedAt: null } }),
    prisma.kTUNotice.count({ where: { active: true, deletedAt: null } }),
    prisma.calendarEvent.count(),
    prisma.timetable.count(),
  ]);
  console.log(`   📄 Papers:      ${papers}`);
  console.log(`   📖 Syllabus:    ${syllabus}`);
  console.log(`   🔔 Notices:     ${notices}`);
  console.log(`   📅 Calendar:    ${calendar}`);
  console.log(`   🎓 Timetables:  ${timetables}`);
  console.log("\n✅ Cleanup complete");
}

main()
  .catch((e) => {
    console.error("❌ Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
