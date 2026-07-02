/**
 * Admin API — Calendar events CRUD.
 *
 * Auth: Bearer ADMIN_API_KEY. CORS handled by `@/lib/auth/admin-cors`.
 *
 *   GET    /api/v1/admin/calendar              — list all
 *   POST   /api/v1/admin/calendar              — create
 *   PUT    /api/v1/admin/calendar?id=<id>      — update
 *   DELETE /api/v1/admin/calendar?id=<id>      — hard-delete
 *   OPTIONS /api/v1/admin/calendar             — CORS preflight
 */
import { NextRequest } from "next/server";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listAllCalendarEventsForAdmin,
  CalendarEventInputSchema,
} from "@/features/admin/actions";
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
    const events = await listAllCalendarEventsForAdmin();
    return adminJsonResponse({ events });
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

  const parsed = CalendarEventInputSchema.safeParse(body);
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
    const event = await createCalendarEvent(parsed.data);
    return adminJsonResponse({ event }, 201);
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return adminJsonResponse(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      400,
    );
  }

  const parsed = CalendarEventInputSchema.partial().safeParse(body);
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
    const event = await updateCalendarEvent(id, parsed.data);
    return adminJsonResponse({ event });
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
    await deleteCalendarEvent(id);
    return adminJsonResponse({ ok: true });
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
