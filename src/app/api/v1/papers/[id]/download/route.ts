import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/storage/r2";
import { getAuthenticatedStudent } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Download a question paper PDF.
 *
 * Flow:
 *   1. Authenticate the student via httpOnly JWT cookie.
 *   2. Look up the paper by id (skip soft-deleted).
 *   3. Generate a 2-minute signed R2 URL.
 *   4. Increment the download counter.
 *   5. 302 redirect to the signed URL.
 *
 * The signed URL includes `response-content-disposition=attachment` so the
 * browser downloads the file with a clean filename instead of displaying the
 * raw R2 object key. The filename is derived from the paper title + .pdf.
 *
 * If the student is not authenticated, returns 401. The student UI should
 * prompt them to log in first.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedStudent(req);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login required to download papers" } },
      { status: 401 },
    );
  }

  const { id } = await params;
  const paper = await db.questionPaper.findUnique({ where: { id } });
  if (!paper || paper.deletedAt) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Paper not found" } },
      { status: 404 },
    );
  }

  try {
    // Build a clean download filename: "Os — END SEM May 2026.pdf"
    const safeTitle = paper.title
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);
    const filename = `${safeTitle || "paper"}.pdf`;

    // R2 / S3 presigned URLs support overriding response headers via query
    // params. This makes the browser save with our filename instead of the
    // raw object key.
    const signedUrl = await getSignedDownloadUrl(
      paper.fileUrl,
      120,
      `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );

    // Increment download counter (best-effort, non-blocking)
    await db.questionPaper.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });

    return NextResponse.redirect(signedUrl, 302);
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          code: "DOWNLOAD_FAILED",
          message: e instanceof Error ? e.message : "Failed to generate download URL",
        },
      },
      { status: 500 },
    );
  }
}
