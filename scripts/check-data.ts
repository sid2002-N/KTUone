import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  console.log("=== ALL notices (including soft-deleted) ===");
  const notices = await prisma.kTUNotice.findMany({ orderBy: { publishedAt: "desc" } });
  for (const n of notices) {
    console.log(`  id=${n.id} key=${n.key} title="${n.title}" active=${n.active} deletedAt=${n.deletedAt?.toISOString() ?? "null"}`);
  }
  console.log(`\nTotal notices: ${notices.length}`);
  
  console.log("\n=== ALL papers ===");
  const papers = await prisma.questionPaper.findMany({ orderBy: { uploadedAt: "desc" } });
  for (const p of papers) {
    console.log(`  id=${p.id} title="${p.title}" fileUrl=${p.fileUrl} deletedAt=${p.deletedAt?.toISOString() ?? "null"}`);
  }
  
  console.log("\n=== ALL calendar events ===");
  const events = await prisma.calendarEvent.findMany({ orderBy: { startDate: "desc" } });
  for (const e of events) {
    console.log(`  id=${e.id} title="${e.title}" start=${e.startDate.toISOString()}`);
  }
  
  console.log("\n=== ALL timetables ===");
  const tts = await prisma.timetable.findMany({ orderBy: { updatedAt: "desc" } });
  for (const t of tts) {
    console.log(`  id=${t.id} title="${t.title}" branch=${t.branchCode} sem=${t.semester} active=${t.isActive}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
