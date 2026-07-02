/**
 * Admin API — Timetables CRUD.
 *
 * Auth: Bearer ADMIN_API_KEY. CORS handled by `@/lib/auth/admin-cors`.
 *
 *   GET    /api/v1/admin/timetables              — list all (incl. archived)
 *   POST   /api/v1/admin/timetables              — create (auto-archives siblings)
 *   PUT    /api/v1/admin/timetables?id=<id>      — toggle active flag
 *   DELETE /api/v1/admin/timetables?id=<id>      — hard-delete (+ R2 cleanup)
 *   OPTIONS /api/v1/admin/timetables             — CORS preflight
 *
 * Note: timetables are uploaded to R2 by a separate flow (or directly by an
 * admin). This route's POST expects the R2 object key in `fileUrl` — it does
 * not handle multipart upload. If a future spec needs upload here, mirror the
 * papers/upload pattern.
 */
import { NextRequest } from "next/server";
import {
  createTimetable,
  deleteTimetable,
  toggleTimetableActive,
  listAllTimetablesForAdmin,
  TimetableInputSchema,
} from "@/features/timetable/actions";
import { deleteFromR2 } from "@/lib/storage/r2";
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
    const timetables = await listAllTimetablesForAdmin();
    return adminJsonResponse({ timetables });
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

export async function POST(req: NextRequest) {
  if (!auth(req)) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return adminJsonResponse(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      400,
    );
  }

  const parsed = TimetableInputSchema.safeParse(body);
  if (!parsed.success) {
    return adminJsonResponse(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: parsed.error.issues[0]?.message ?? "Invalid input",
        },
      },
      400,
    );
  }

  try {
    const timetable = await createTimetable(parsed.data);
    return adminJsonResponse({ timetable }, 201);
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

export async function PUT(req: NextRequest) {
  if (!auth(req)) return unauthorized();

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return adminJsonResponse(
      { error: { code: "BAD_REQUEST", message: "Missing ?id=" } },
      400,
    );
  }

  try {
    const timetable = await toggleTimetableActive(id);
    return adminJsonResponse({ timetable });
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
    const result = await deleteTimetable(id);
    // Best-effort R2 cleanup. Surface failure but don't fail the HTTP request —
    // the DB row is already gone.
    let r2Deleted = true;
    let r2Error: string | undefined;
    if (result.fileUrl) {
      try {
        await deleteFromR2(result.fileUrl);
      } catch (e) {
        r2Deleted = false;
        r2Error = e instanceof Error ? e.message : "R2 delete failed";
      }
    }
    return adminJsonResponse({ ok: true, r2Deleted, r2Error });
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
