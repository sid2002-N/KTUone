/**
 * Admin API — Notices CRUD.
 *
 * Auth: Bearer ADMIN_API_KEY. CORS handled by `@/lib/auth/admin-cors`.
 *
 *   GET    /api/v1/admin/notices              — list all (incl. soft-deleted)
 *   POST   /api/v1/admin/notices              — create
 *   PUT    /api/v1/admin/notices?id=<id>      — update
 *   DELETE /api/v1/admin/notices?id=<id>      — soft-delete
 *   OPTIONS /api/v1/admin/notices             — CORS preflight
 */
import { NextRequest } from "next/server";
import {
  createNotice,
  updateNotice,
  deleteNotice,
  listAllNoticesForAdmin,
  NoticeInputSchema,
} from "@/features/admin/actions";
import { adminJsonResponse, handleAdminOptions } from "@/lib/auth/admin-cors";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  if (!auth(req)) return unauthorized();
  try {
    const notices = await listAllNoticesForAdmin();
    return adminJsonResponse({ notices });
  } catch (e) {
    return adminJsonResponse(
      { error: { code: "INTERNAL", message: e instanceof Error ? e.message : "Failed" } },
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

  const parsed = NoticeInputSchema.safeParse(body);
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
    const notice = await createNotice(parsed.data);
    return adminJsonResponse({ notice }, 201);
  } catch (e) {
    return adminJsonResponse(
      { error: { code: "INTERNAL", message: e instanceof Error ? e.message : "Failed" } },
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return adminJsonResponse(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      400,
    );
  }

  const parsed = NoticeInputSchema.partial().safeParse(body);
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
    const notice = await updateNotice(id, parsed.data);
    return adminJsonResponse({ notice });
  } catch (e) {
    return adminJsonResponse(
      { error: { code: "INTERNAL", message: e instanceof Error ? e.message : "Failed" } },
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
    await deleteNotice(id);
    return adminJsonResponse({ ok: true });
  } catch (e) {
    return adminJsonResponse(
      { error: { code: "INTERNAL", message: e instanceof Error ? e.message : "Failed" } },
      500,
    );
  }
}
