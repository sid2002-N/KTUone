import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const all = await prisma.questionPaper.findMany({
    where: { deletedAt: null },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 100,
  });
  console.log(`Found ${all.length} non-deleted papers:`);
  for (const p of all) {
    console.log(`  - id=${p.id} title="${p.title}" branch=${p.branchCode} sem=${p.semester} year=${p.year} month=${p.month} deletedAt=${p.deletedAt?.toISOString() ?? "null"}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
