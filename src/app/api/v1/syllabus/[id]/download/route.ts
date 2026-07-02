import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/storage/r2";
import { getAuthenticatedStudent } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Download a syllabus PDF.
 *
 * Same flow as papers/[id]/download but for syllabus. See that route for
 * detailed comments. Generates a 2-minute signed R2 URL with a clean
 * `attachment; filename="..."` content disposition so the browser saves
 * with the syllabus title, not the raw object key.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedStudent(req);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login required to download syllabus" } },
      { status: 401 },
    );
  }

  const { id } = await params;
  const syllabus = await db.syllabus.findUnique({ where: { id } });
  if (!syllabus || syllabus.deletedAt) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Syllabus not found" } },
      { status: 404 },
    );
  }

  try {
    const safeTitle = syllabus.title
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);
    const filename = `${safeTitle || "syllabus"}.pdf`;

    const signedUrl = await getSignedDownloadUrl(
      syllabus.fileUrl,
      120,
      `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );

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
