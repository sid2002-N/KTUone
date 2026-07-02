/**
 * Admin API — Syllabus upload (multipart/form-data).
 *
 * Auth: Bearer ADMIN_API_KEY. CORS handled by `@/lib/auth/admin-cors`.
 *
 *   POST   /api/v1/admin/syllabus/upload
 *     FormData fields:
 *       file         — PDF file (max 20 MB)
 *       title        — string
 *       semester     — number 1..8
 *       branchCode   — string (e.g. "CSE")
 *       subjectCode  — string
 *       subjectName  — string
 *       version      — optional string (default "v2019.1")
 *       modules      — optional number (default 5)
 *   OPTIONS /api/v1/admin/syllabus/upload — CORS preflight
 *
 * The file is uploaded to R2 under a deterministic key built by
 * `buildSyllabusKey`. The Syllabus row stores the R2 key in `fileUrl`.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  uploadToR2,
  buildSyllabusKey,
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
  semester: z.coerce.number().int().min(1).max(8),
  branchCode: z.string().min(1).max(10),
  subjectCode: z.string().min(1).max(30),
  subjectName: z.string().min(1).max(200),
  version: z.string().min(1).max(30).default("v2019.1"),
  modules: z.coerce.number().int().min(1).max(20).default(5),
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
    semester: form.get("semester"),
    branchCode: form.get("branchCode"),
    subjectCode: form.get("subjectCode"),
    subjectName: form.get("subjectName"),
    version: form.get("version") ?? undefined,
    modules: form.get("modules") ?? undefined,
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
  const key = buildSyllabusKey({
    branchCode: meta.branchCode,
    subjectCode: meta.subjectCode,
  });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToR2(key, buffer, contentType);

    const row = await db.syllabus.create({
      data: {
        title: meta.title,
        semester: meta.semester,
        branchCode: meta.branchCode,
        subjectCode: meta.subjectCode,
        subjectName: meta.subjectName,
        version: meta.version,
        fileUrl: key,
        modules: meta.modules,
      },
    });

    return adminJsonResponse(
      {
        syllabus: {
          id: row.id,
          title: row.title,
          semester: row.semester,
          branchCode: row.branchCode,
          subjectCode: row.subjectCode,
          subjectName: row.subjectName,
          version: row.version,
          fileUrl: row.fileUrl,
          modules: row.modules,
          lastUpdated: row.lastUpdated.toISOString(),
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
