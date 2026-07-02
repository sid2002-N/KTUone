/**
 * Admin API — Syllabus list + delete.
 *
 * Auth: Bearer ADMIN_API_KEY. CORS handled by `@/lib/auth/admin-cors`.
 *
 *   GET    /api/v1/admin/syllabus              — list all (incl. soft-deleted)
 *   DELETE /api/v1/admin/syllabus?id=<id>      — soft-delete + R2 cleanup
 *   OPTIONS /api/v1/admin/syllabus             — CORS preflight
 *
 * Uploads go through the sibling `/api/v1/admin/syllabus/upload` route.
 */
import { NextRequest } from "next/server";
import {
  listAllSyllabusForAdmin,
  deleteSyllabus,
} from "@/features/admin/papers-actions";
import { adminJsonResponse, handleAdminOptions } from "@/lib/auth/admin-cors";

export const dynamic = "force-dynamic";

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

export async function OPTIONS() {
  return handleAdminOptions();
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return unauthorized();
  try {
    const syllabus = await listAllSyllabusForAdmin();
    return adminJsonResponse({ syllabus });
  } catch (e) {
    return adminJsonResponse(
      {
        error: {
          code: "INTERNAL",
          message: e instanceof Error ? e.message : "Failed",
        },
      },
      500,
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!auth(req)) return unauthorized();

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return adminJsonResponse(
      { error: { code: "BAD_REQUEST", message: "Missing ?id=" } },
      400,
    );
  }

  try {
    const result = await deleteSyllabus(id);
    return adminJsonResponse(result);
  } catch (e) {
    return adminJsonResponse(
      {
        error: {
          code: "INTERNAL",
          message: e instanceof Error ? e.message : "Failed",
        },
      },
      500,
    );
  }
}
