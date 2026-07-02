"use server";

/**
 * Timetable server actions.
 *
 * Public actions (getActiveTimetable, getAllActiveTimetables) are called from
 * server components / API routes that serve students.
 *
 * Admin actions (createTimetable, deleteTimetable, toggleTimetableActive,
 * listAllTimetablesForAdmin) are called from the `/api/v1/admin/timetables`
 * route handler.
 *
 * Auto-archive semantics: when a new timetable is created for a given
 * (branchCode, semester) pair, all previously-active timetables for that
 * pair are flipped to `isActive = false` and their `archivedAt` is stamped.
 * This guarantees at most one active timetable per branch+semester at any
 * time.
 */
import { z } from "zod";
import { db } from "@/lib/db";
import type { BranchCode, SemesterNumber } from "@/lib/types";
import type { Timetable as PrismaTimetable } from "@prisma/client";

export interface Timetable {
  id: string;
  semester: SemesterNumber;
  branchCode: BranchCode;
  title: string;
  fileUrl: string;
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const TimetableInputSchema = z.object({
  semester: z.number().int().min(1).max(8),
  branchCode: z.string().min(1).max(10),
  title: z.string().min(1).max(300),
  fileUrl: z.string().min(1).max(500), // R2 object key
  isActive: z.boolean().default(true),
});

export type TimetableInput = z.infer<typeof TimetableInputSchema>;

/* ---------- Public (student-facing) ---------- */

/**
 * Return the active timetable for a given semester + branch, or null if none.
 */
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

/**
 * Return all active timetables across all branches/semesters.
 * Useful for the dashboard's "latest timetables" strip.
 */
export async function getAllActiveTimetables(): Promise<Timetable[]> {
  const rows = await db.timetable.findMany({
    where: { isActive: true },
    orderBy: [{ branchCode: "asc" }, { semester: "asc" }],
  });
  return rows.map(rowToTimetable);
}

/* ---------- Admin ---------- */

/**
 * Create a new timetable, auto-archiving any currently-active timetable for
 * the same (branchCode, semester) pair. Returns the created timetable.
 */
export async function createTimetable(
  input: TimetableInput,
): Promise<Timetable> {
  const parsed = TimetableInputSchema.parse(input);

  return db.$transaction(async (tx) => {
    // 1. Auto-archive any existing active timetable for the same branch+sem.
    await tx.timetable.updateMany({
      where: {
        branchCode: parsed.branchCode,
        semester: parsed.semester,
        isActive: true,
      },
      data: { isActive: false, archivedAt: new Date() },
    });

    // 2. Create the new timetable.
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

/**
 * Hard-delete a timetable. We don't soft-delete because timetables are
 * point-in-time uploads and an admin "delete" means "remove this version
 * entirely". R2 cleanup is the responsibility of the route handler (it has
 * access to deleteFromR2 and the storage key).
 *
 * Returns the deleted row's fileUrl so the caller can clean up R2.
 */
export async function deleteTimetable(
  id: string,
): Promise<{ ok: true; fileUrl: string | null }> {
  const existing = await db.timetable.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Timetable ${id} not found`);
  }
  await db.timetable.delete({ where: { id } });
  return { ok: true, fileUrl: existing.fileUrl };
}

/**
 * Flip a timetable's `isActive` flag. If activating, also auto-archives any
 * other active timetable for the same (branchCode, semester) pair — this
 * preserves the "at most one active per branch+sem" invariant.
 */
export async function toggleTimetableActive(id: string): Promise<Timetable> {
  const existing = await db.timetable.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Timetable ${id} not found`);
  }

  const newActive = !existing.isActive;

  return db.$transaction(async (tx) => {
    if (newActive) {
      // Auto-archive siblings for the same branch+sem.
      await tx.timetable.updateMany({
        where: {
          branchCode: existing.branchCode,
          semester: existing.semester,
          isActive: true,
          id: { not: id },
        },
        data: { isActive: false, archivedAt: new Date() },
      });
    }

    const row = await tx.timetable.update({
      where: { id },
      data: {
        isActive: newActive,
        archivedAt: newActive ? null : existing.archivedAt ?? new Date(),
      },
    });
    return rowToTimetable(row);
  });
}

/**
 * List ALL timetables for the admin panel — includes archived rows.
 */
export async function listAllTimetablesForAdmin(): Promise<Timetable[]> {
  const rows = await db.timetable.findMany({
    orderBy: [
      { branchCode: "asc" },
      { semester: "asc" },
      { isActive: "desc" },
      { updatedAt: "desc" },
    ],
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
