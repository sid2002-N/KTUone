import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  // Hard-delete soft-deleted test notices from verification runs
  const res = await prisma.kTUNotice.deleteMany({
    where: {
      key: { startsWith: "admin-" },
      title: { in: ["Smoke Test Notice", "Audit Test Notice", "Final Verify"] },
    },
  });
  console.log(`Deleted ${res.count} soft-deleted test notices`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
