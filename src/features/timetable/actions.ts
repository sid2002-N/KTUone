"use server";
import type { Timetable, TimetableInput } from "@/features/timetable/schema";
import { TimetableInputSchema } from "@/features/timetable/schema";
export type { Timetable } from "@/features/timetable/schema";

import { db } from "@/lib/db";
import type { BranchCode, SemesterNumber } from "@/lib/types";
import type { Timetable as PrismaTimetable } from "@prisma/client";

/* ---------- Public (student-facing) ---------- */

export async function getActiveTimetable(
  semester: number,
  branchCode: string,
): Promise<Timetable | null> {
  const row = await db.timetable.findFirst({
    where: { semester, branchCode, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  return row ? rowToTimetable(row) : null;
}

export async function getAllActiveTimetables(): Promise<Timetable[]> {
  const rows = await db.timetable.findMany({
    where: { isActive: true },
    orderBy: [{ branchCode: "asc" }, { semester: "asc" }],
  });
  return rows.map(rowToTimetable);
}

/* ---------- Admin ---------- */

export async function createTimetable(
  input: TimetableInput,
): Promise<Timetable> {
  const parsed = TimetableInputSchema.parse(input);

  return db.$transaction(async (tx) => {
    await tx.timetable.updateMany({
      where: { branchCode: parsed.branchCode, semester: parsed.semester, isActive: true },
      data: { isActive: false, archivedAt: new Date() },
    });

    const row = await tx.timetable.create({
      data: {
        semester: parsed.semester,
        branchCode: parsed.branchCode,
        title: parsed.title,
        fileUrl: parsed.fileUrl,
        isActive: parsed.isActive,
      },
    });
    return rowToTimetable(row);
  });
}

export async function deleteTimetable(
  id: string,
): Promise<{ ok: true; fileUrl: string | null }> {
  const existing = await db.timetable.findUnique({ where: { id } });
  if (!existing) throw new Error(`Timetable ${id} not found`);
  await db.timetable.delete({ where: { id } });
  return { ok: true, fileUrl: existing.fileUrl };
}

export async function toggleTimetableActive(id: string): Promise<Timetable> {
  const existing = await db.timetable.findUnique({ where: { id } });
  if (!existing) throw new Error(`Timetable ${id} not found`);
  const newActive = !existing.isActive;

  return db.$transaction(async (tx) => {
    if (newActive) {
      await tx.timetable.updateMany({
        where: { branchCode: existing.branchCode, semester: existing.semester, isActive: true, id: { not: id } },
        data: { isActive: false, archivedAt: new Date() },
      });
    }
    const row = await tx.timetable.update({
      where: { id },
      data: { isActive: newActive, archivedAt: newActive ? null : existing.archivedAt ?? new Date() },
    });
    return rowToTimetable(row);
  });
}

export async function listAllTimetablesForAdmin(): Promise<Timetable[]> {
  const rows = await db.timetable.findMany({
    orderBy: [{ branchCode: "asc" }, { semester: "asc" }, { isActive: "desc" }, { updatedAt: "desc" }],
    take: 500,
  });
  return rows.map(rowToTimetable);
}

/* ---------- Helpers ---------- */

function rowToTimetable(r: PrismaTimetable): Timetable {
  return {
    id: r.id,
    semester: r.semester as SemesterNumber,
    branchCode: r.branchCode as BranchCode,
    title: r.title,
    fileUrl: r.fileUrl,
    isActive: r.isActive,
    archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
