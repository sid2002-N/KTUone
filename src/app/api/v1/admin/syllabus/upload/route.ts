/**
 * Admin API — Syllabus PDF upload.
 *
 * Multipart form data: file (PDF) + metadata fields.
 * Uploads the PDF to R2, creates a Syllabus row in the DB.
 *
 * Auth: Bearer ADMIN_API_KEY.
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { uploadToR2, buildSyllabusKey } from "@/lib/storage/r2";
import { adminJsonResponse, handleAdminOptions } from "@/lib/auth/admin-cors";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function auth(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.ADMIN_API_KEY}`;
}

function unauthorized() {
  return adminJsonResponse(
    { error: { code: "UNAUTHORIZED", message: "Invalid admin API key" } },
    401,
  );
}

export async function OPTIONS() {
  return handleAdminOptions();
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return unauthorized();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const subjectCode = formData.get("subjectCode") as string | null;
    const subjectName = formData.get("subjectName") as string | null;
    const semester = Number(formData.get("semester"));
    const branchCode = formData.get("branchCode") as string | null;
    const version = (formData.get("version") as string | null) ?? "v2019.1";
    const modules = Number(formData.get("modules") || 5);

    if (!file || !title || !subjectCode || !subjectName || !branchCode) {
      return adminJsonResponse(
        { error: { code: "BAD_REQUEST", message: "Missing required fields" } },
        400,
      );
    }

    if (isNaN(semester)) {
      return adminJsonResponse(
        { error: { code: "BAD_REQUEST", message: "Invalid semester" } },
        400,
      );
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return adminJsonResponse(
        { error: { code: "BAD_REQUEST", message: "File must be a PDF" } },
        400,
      );
    }

    // Build R2 key
    const key = buildSyllabusKey({ branchCode, subjectCode });

    // Upload to R2
    const bytes = new Uint8Array(await file.arrayBuffer());
    await uploadToR2(key, bytes, "application/pdf");

    // Create DB row
    const syllabus = await db.syllabus.create({
      data: {
        title,
        semester,
        branchCode,
        subjectCode,
        subjectName,
        version,
        fileUrl: key,
        modules,
      },
    });

    return adminJsonResponse({ syllabus }, 201);
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
