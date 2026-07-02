/**
 * Admin API — Question paper upload (multipart/form-data).
 *
 * Auth: Bearer ADMIN_API_KEY. CORS handled by `@/lib/auth/admin-cors`.
 *
 *   POST   /api/v1/admin/papers/upload
 *     FormData fields:
 *       file         — PDF file (max 20 MB)
 *       title        — string
 *       subjectCode  — string
 *       subjectName  — string
 *       semester     — number 1..8
 *       branchCode   — string (e.g. "CSE")
 *       year         — number (e.g. 2024)
 *       month        — number 1..12
 *       examType     — "END_SEM" | "SERIES_1" | "SERIES_2" | "MODEL"
 *       pageCount    — optional number
 *   OPTIONS /api/v1/admin/papers/upload — CORS preflight
 *
 * The file is uploaded to R2 under a deterministic key built by
 * `buildPaperKey`. The QuestionPaper row stores the R2 key in `fileUrl`.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  uploadToR2,
  buildPaperKey,
} from "@/lib/storage/r2";
import { adminJsonResponse, handleAdminOptions } from "@/lib/auth/admin-cors";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_CONTENT_TYPES = ["application/pdf"];

function auth(req: NextRequest): boolean {
  return (
    req.headers.get("authorization") === `Bearer ${process.env.ADMIN_API_KEY}`
  );
}

function unauthorized() {
  return adminJsonResponse(
    { error: { code: "UNAUTHORIZED", message: "Invalid admin API key" } },
    401,
  );
}

const MetadataSchema = z.object({
  title: z.string().min(1).max(300),
  subjectCode: z.string().min(1).max(30),
  subjectName: z.string().min(1).max(200),
  semester: z.coerce.number().int().min(1).max(8),
  branchCode: z.string().min(1).max(10),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  examType: z.enum(["END_SEM", "SERIES_1", "SERIES_2", "MODEL"]),
  pageCount: z.coerce.number().int().min(0).max(1000).optional(),
});

export async function OPTIONS() {
  return handleAdminOptions();
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return unauthorized();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return adminJsonResponse(
      { error: { code: "BAD_REQUEST", message: "Expected multipart/form-data" } },
      400,
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return adminJsonResponse(
      { error: { code: "BAD_REQUEST", message: "Missing 'file' field" } },
      400,
    );
  }

  if (file.size === 0) {
    return adminJsonResponse(
      { error: { code: "BAD_REQUEST", message: "File is empty" } },
      400,
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return adminJsonResponse(
      {
        error: {
          code: "FILE_TOO_LARGE",
          message: `File is ${(file.size / 1024 / 1024).toFixed(2)} MB; max is 20 MB`,
        },
      },
      413,
    );
  }

  const contentType = file.type || "application/pdf";
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return adminJsonResponse(
      {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: `Only PDF files are accepted (got ${contentType || "unknown"})`,
        },
      },
      415,
    );
  }

  const parsed = MetadataSchema.safeParse({
    title: form.get("title"),
    subjectCode: form.get("subjectCode"),
    subjectName: form.get("subjectName"),
    semester: form.get("semester"),
    branchCode: form.get("branchCode"),
    year: form.get("year"),
    month: form.get("month"),
    examType: form.get("examType"),
    pageCount: form.get("pageCount") ?? undefined,
  });
  if (!parsed.success) {
    return adminJsonResponse(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: parsed.error.issues[0]?.message ?? "Invalid metadata",
        },
      },
      400,
    );
  }

  const meta = parsed.data;
  const key = buildPaperKey({
    branchCode: meta.branchCode,
    year: meta.year,
    month: meta.month,
    subjectCode: meta.subjectCode,
    examType: meta.examType,
  });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { size } = await uploadToR2(key, buffer, contentType);

    const row = await db.questionPaper.create({
      data: {
        title: meta.title,
        subjectCode: meta.subjectCode,
        subjectName: meta.subjectName,
        semester: meta.semester,
        branchCode: meta.branchCode,
        year: meta.year,
        month: meta.month,
        examType: meta.examType,
        fileUrl: key,
        fileSizeBytes: size,
        pageCount: meta.pageCount ?? 0,
      },
    });

    return adminJsonResponse(
      {
        paper: {
          id: row.id,
          title: row.title,
          subjectCode: row.subjectCode,
          subjectName: row.subjectName,
          semester: row.semester,
          branchCode: row.branchCode,
          year: row.year,
          month: row.month,
          examType: row.examType,
          fileUrl: row.fileUrl,
          fileSizeBytes: row.fileSizeBytes,
          pageCount: row.pageCount,
          uploadedAt: row.uploadedAt.toISOString(),
        },
      },
      201,
    );
  } catch (e) {
    return adminJsonResponse(
      {
        error: {
          code: "INTERNAL",
          message: e instanceof Error ? e.message : "Upload failed",
        },
      },
      500,
    );
  }
}
