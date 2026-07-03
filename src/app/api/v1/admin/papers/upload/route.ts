/**
 * Admin API — Question paper PDF upload.
 *
 * Multipart form data: file (PDF) + metadata fields.
 * Uploads the PDF to R2, creates a QuestionPaper row in the DB.
 *
 * Auth: Bearer ADMIN_API_KEY.
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { uploadToR2, buildPaperKey } from "@/lib/storage/r2";
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
    const year = Number(formData.get("year"));
    const month = Number(formData.get("month"));
    const examType = formData.get("examType") as string | null;

    if (!file || !title || !subjectCode || !subjectName || !branchCode || !examType) {
      return adminJsonResponse(
        { error: { code: "BAD_REQUEST", message: "Missing required fields" } },
        400,
      );
    }

    if (isNaN(semester) || isNaN(year) || isNaN(month)) {
      return adminJsonResponse(
        { error: { code: "BAD_REQUEST", message: "Invalid numeric fields" } },
        400,
      );
    }

    if (file.type !== "application/pdf") {
      return adminJsonResponse(
        { error: { code: "BAD_REQUEST", message: "File must be a PDF" } },
        400,
      );
    }

    const key = buildPaperKey({
      branchCode,
      year,
      month,
      subjectCode,
      examType,
    });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { size } = await uploadToR2(key, bytes, "application/pdf");

    const paper = await db.questionPaper.create({
      data: {
        title,
        subjectCode,
        subjectName,
        semester,
        branchCode,
        year,
        month,
        examType,
        fileUrl: key,
        fileSizeBytes: size,
        pageCount: 0,
      },
    });

    return adminJsonResponse({ paper }, 201);
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
