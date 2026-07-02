"use server";

/**
 * Admin server actions — Question Papers + Syllabus management.
 *
 * Reusable server-side functions called by the
 * `/api/v1/admin/papers` and `/api/v1/admin/syllabus` route handlers.
 *
 * `deletePaper` and `deleteSyllabus` both:
 *   1. Soft-delete the DB row (set `deletedAt`) so it disappears from public
 *      lists but is retained for audit.
 *   2. Delete the underlying R2 object so the storage bill doesn't grow
 *      unbounded. The R2 delete is best-effort — if it fails we still mark the
 *      row as soft-deleted and surface the storage error to the caller.
 */
import { db } from "@/lib/db";
import { deleteFromR2 } from "@/lib/storage/r2";
import type {
  ExamType,
  QuestionPaper,
  Syllabus,
} from "@/lib/types";
import type {
  QuestionPaper as PrismaQuestionPaper,
  Syllabus as PrismaSyllabus,
} from "@prisma/client";

/* ===================================================================== */
/* Question papers                                                        */
/* ===================================================================== */

export interface AdminPaperListItem {
  id: string;
  title: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  branchCode: string;
  year: number;
  month: number;
  examType: ExamType;
  fileUrl: string;
  fileSizeBytes: number;
  pageCount: number;
  downloads: number;
  views: number;
  uploadedAt: string;
  deletedAt: string | null;
}

/**
 * List ALL question papers for the admin panel — includes soft-deleted rows.
 */
export async function listAllPapersForAdmin(): Promise<AdminPaperListItem[]> {
  const rows = await db.questionPaper.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }, { uploadedAt: "desc" }],
    take: 500,
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    subjectCode: r.subjectCode,
    subjectName: r.subjectName,
    semester: r.semester,
    branchCode: r.branchCode,
    year: r.year,
    month: r.month,
    examType: r.examType as ExamType,
    fileUrl: r.fileUrl,
    fileSizeBytes: r.fileSizeBytes,
    pageCount: r.pageCount,
    downloads: r.downloads,
    views: r.views,
    uploadedAt: r.uploadedAt.toISOString(),
    deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
  }));
}

/**
 * Soft-delete a question paper AND remove its R2 object.
 *
 * The DB soft-delete happens first (so the row is hidden from public lists
 * even if the R2 delete fails). The R2 delete is then attempted; any error is
 * captured and returned to the caller rather than thrown, so the admin sees a
 * partial-success response instead of a 500.
 */
export async function deletePaper(
  id: string,
): Promise<{ ok: true; r2Deleted: boolean; r2Error?: string }> {
  const row = await db.questionPaper.findUnique({ where: { id } });
  if (!row) {
    throw new Error(`Question paper ${id} not found`);
  }

  // 1. Soft-delete the DB row first (idempotent — safe to call twice).
  if (!row.deletedAt) {
    await db.questionPaper.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // 2. Best-effort R2 cleanup. fileUrl stores the R2 object key.
  if (row.fileUrl) {
    try {
      await deleteFromR2(row.fileUrl);
      return { ok: true, r2Deleted: true };
    } catch (e) {
      return {
        ok: true,
        r2Deleted: false,
        r2Error: e instanceof Error ? e.message : "R2 delete failed",
      };
    }
  }

  return { ok: true, r2Deleted: true };
}

/* ===================================================================== */
/* Syllabus                                                               */
/* ===================================================================== */

export interface AdminSyllabusListItem {
  id: string;
  title: string;
  semester: number;
  branchCode: string;
  subjectCode: string;
  subjectName: string;
  version: string;
  fileUrl: string;
  lastUpdated: string;
  modules: number;
  deletedAt: string | null;
}

export async function listAllSyllabusForAdmin(): Promise<
  AdminSyllabusListItem[]
> {
  const rows = await db.syllabus.findMany({
    orderBy: [{ semester: "asc" }, { subjectCode: "asc" }],
    take: 500,
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    semester: r.semester,
    branchCode: r.branchCode,
    subjectCode: r.subjectCode,
    subjectName: r.subjectName,
    version: r.version,
    fileUrl: r.fileUrl,
    lastUpdated: r.lastUpdated.toISOString(),
    modules: r.modules,
    deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
  }));
}

export async function deleteSyllabus(
  id: string,
): Promise<{ ok: true; r2Deleted: boolean; r2Error?: string }> {
  const row = await db.syllabus.findUnique({ where: { id } });
  if (!row) {
    throw new Error(`Syllabus ${id} not found`);
  }

  if (!row.deletedAt) {
    await db.syllabus.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  if (row.fileUrl) {
    try {
      await deleteFromR2(row.fileUrl);
      return { ok: true, r2Deleted: true };
    } catch (e) {
      return {
        ok: true,
        r2Deleted: false,
        r2Error: e instanceof Error ? e.message : "R2 delete failed",
      };
    }
  }

  return { ok: true, r2Deleted: true };
}

/* ===================================================================== */
/* Helpers — kept for parity with the public actions types                */
/* ===================================================================== */

/** Re-shape a Prisma QuestionPaper row to the public QuestionPaper shape. */
export function toPublicPaper(r: PrismaQuestionPaper): QuestionPaper {
  return {
    id: r.id,
    title: r.title,
    subjectCode: r.subjectCode,
    subjectName: r.subjectName,
    semester: r.semester as QuestionPaper["semester"],
    branchCode: r.branchCode as QuestionPaper["branchCode"],
    year: r.year,
    month: r.month,
    examType: r.examType as ExamType,
    fileUrl: r.fileUrl,
    fileSizeBytes: r.fileSizeBytes,
    pageCount: r.pageCount,
    downloads: r.downloads,
    views: r.views,
    uploadedAt: r.uploadedAt.toISOString(),
  };
}

/** Re-shape a Prisma Syllabus row to the public Syllabus shape. */
export function toPublicSyllabus(r: PrismaSyllabus): Syllabus {
  return {
    id: r.id,
    title: r.title,
    semester: r.semester as Syllabus["semester"],
    branchCode: r.branchCode as Syllabus["branchCode"],
    subjectCode: r.subjectCode,
    subjectName: r.subjectName,
    version: r.version,
    fileUrl: r.fileUrl,
    lastUpdated: r.lastUpdated.toISOString(),
    modules: r.modules,
  };
}
