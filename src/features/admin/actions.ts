"use server";

/**
 * Admin server actions — Notices + Calendar CRUD.
 *
 * These are reusable server-side functions called by the
 * `/api/v1/admin/notices` and `/api/v1/admin/calendar` route handlers. They are
 * NOT exposed directly to client components — admin routes authenticate via a
 * Bearer ADMIN_API_KEY and then delegate to these actions.
 *
 * Validation uses Zod. All DB access goes through `@/lib/db`.
 */
import { z } from "zod";
import { db } from "@/lib/db";
import type {
  CalendarEvent,
  CalendarEventType,
  KTUNotice,
  NoticeCategory,
  NoticePriority,
} from "@/lib/types";
import type {
  CalendarEvent as PrismaCalendarEvent,
  KTUNotice as PrismaKTUNotice,
} from "@prisma/client";

/* ===================================================================== */
/* Notices                                                                */
/* ===================================================================== */

export const NoticeInputSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(5000),
  category: z.enum([
    "Academic",
    "Examination",
    "Scholarship",
    "Placement",
    "Cultural",
    "General",
  ]),
  publishedAt: z.string().min(1),
  priority: z.enum(["Pinned", "High", "Normal", "Low"]).default("Normal"),
  pdfUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  externalUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  tags: z.array(z.string().max(60)).max(20).default([]),
  pinned: z.boolean().default(false),
  active: z.boolean().default(true),
});

export type NoticeInput = z.infer<typeof NoticeInputSchema>;

export async function createNotice(input: NoticeInput): Promise<KTUNotice> {
  const parsed = NoticeInputSchema.parse(input);
  const publishedAt = new Date(parsed.publishedAt);
  if (isNaN(publishedAt.getTime())) {
    throw new Error("Invalid publishedAt date");
  }

  // `key` is a unique slug — derive from title + timestamp for admin-created notices.
  const key = `admin-${Date.now()}-${slugify(parsed.title)}`;

  const row = await db.kTUNotice.create({
    data: {
      key,
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      publishedAt,
      priority: parsed.priority,
      pdfUrl: parsed.pdfUrl ?? null,
      externalUrl: parsed.externalUrl ?? null,
      tags: JSON.stringify(parsed.tags),
      pinned: parsed.pinned,
      active: parsed.active,
    },
  });

  return rowToNotice(row);
}

export async function updateNotice(
  id: string,
  input: Partial<NoticeInput>,
): Promise<KTUNotice> {
  const parsed = NoticeInputSchema.partial().parse(input);

  const data: Record<string, unknown> = {};
  if (parsed.title !== undefined) data.title = parsed.title;
  if (parsed.description !== undefined) data.description = parsed.description;
  if (parsed.category !== undefined) data.category = parsed.category;
  if (parsed.priority !== undefined) data.priority = parsed.priority;
  if (parsed.pdfUrl !== undefined) data.pdfUrl = parsed.pdfUrl || null;
  if (parsed.externalUrl !== undefined)
    data.externalUrl = parsed.externalUrl || null;
  if (parsed.tags !== undefined) data.tags = JSON.stringify(parsed.tags);
  if (parsed.pinned !== undefined) data.pinned = parsed.pinned;
  if (parsed.active !== undefined) data.active = parsed.active;
  if (parsed.publishedAt !== undefined) {
    const publishedAt = new Date(parsed.publishedAt);
    if (isNaN(publishedAt.getTime())) {
      throw new Error("Invalid publishedAt date");
    }
    data.publishedAt = publishedAt;
  }

  const row = await db.kTUNotice.update({ where: { id }, data });
  return rowToNotice(row);
}

/**
 * Soft-delete a notice — sets `deletedAt` so it disappears from public lists
 * but is retained for audit in the admin panel.
 */
export async function deleteNotice(id: string): Promise<{ ok: true }> {
  await db.kTUNotice.update({
    where: { id },
    data: { deletedAt: new Date(), active: false },
  });
  return { ok: true };
}

/**
 * List ALL notices for the admin panel — includes soft-deleted and inactive
 * rows. Ordered by publishedAt desc.
 */
export async function listAllNoticesForAdmin(): Promise<KTUNotice[]> {
  const rows = await db.kTUNotice.findMany({
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: 500,
  });
  return rows.map(rowToNotice);
}

/* ===================================================================== */
/* Calendar events                                                        */
/* ===================================================================== */

export const CalendarEventInputSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(2000),
  type: z.enum([
    "EXAM",
    "HOLIDAY",
    "RESULT",
    "REGISTRATION",
    "WORKSHOP",
    "DEADLINE",
    "EVENT",
  ]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  allDay: z.boolean().default(true),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#9333EA"),
  reminderEnabled: z.boolean().default(false),
});

export type CalendarEventInput = z.infer<typeof CalendarEventInputSchema>;

export async function createCalendarEvent(
  input: CalendarEventInput,
): Promise<CalendarEvent> {
  const parsed = CalendarEventInputSchema.parse(input);
  const startDate = new Date(parsed.startDate);
  const endDate = new Date(parsed.endDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Invalid startDate or endDate");
  }
  if (endDate < startDate) {
    throw new Error("endDate must not be before startDate");
  }

  const row = await db.calendarEvent.create({
    data: {
      title: parsed.title,
      description: parsed.description,
      type: parsed.type,
      startDate,
      endDate,
      allDay: parsed.allDay,
      color: parsed.color,
      reminderEnabled: parsed.reminderEnabled,
    },
  });
  return rowToCalendarEvent(row);
}

export async function updateCalendarEvent(
  id: string,
  input: Partial<CalendarEventInput>,
): Promise<CalendarEvent> {
  const parsed = CalendarEventInputSchema.partial().parse(input);

  const data: Record<string, unknown> = {};
  if (parsed.title !== undefined) data.title = parsed.title;
  if (parsed.description !== undefined) data.description = parsed.description;
  if (parsed.type !== undefined) data.type = parsed.type;
  if (parsed.allDay !== undefined) data.allDay = parsed.allDay;
  if (parsed.color !== undefined) data.color = parsed.color;
  if (parsed.reminderEnabled !== undefined)
    data.reminderEnabled = parsed.reminderEnabled;
  if (parsed.startDate !== undefined) {
    const startDate = new Date(parsed.startDate);
    if (isNaN(startDate.getTime())) throw new Error("Invalid startDate");
    data.startDate = startDate;
  }
  if (parsed.endDate !== undefined) {
    const endDate = new Date(parsed.endDate);
    if (isNaN(endDate.getTime())) throw new Error("Invalid endDate");
    data.endDate = endDate;
  }

  const row = await db.calendarEvent.update({ where: { id }, data });
  return rowToCalendarEvent(row);
}

/**
 * Hard-delete a calendar event. CalendarEvents don't have a soft-delete column
 * — they are point-in-time entries and safe to remove outright.
 */
export async function deleteCalendarEvent(id: string): Promise<{ ok: true }> {
  await db.calendarEvent.delete({ where: { id } });
  return { ok: true };
}

export async function listAllCalendarEventsForAdmin(): Promise<CalendarEvent[]> {
  const rows = await db.calendarEvent.findMany({
    orderBy: { startDate: "desc" },
    take: 500,
  });
  return rows.map(rowToCalendarEvent);
}

/* ===================================================================== */
/* Helpers                                                                */
/* ===================================================================== */

function rowToNotice(r: PrismaKTUNotice): KTUNotice {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category as NoticeCategory,
    publishedAt: r.publishedAt.toISOString(),
    priority: r.priority as NoticePriority,
    pdfUrl: r.pdfUrl ?? undefined,
    externalUrl: r.externalUrl ?? undefined,
    tags: JSON.parse(r.tags) as string[],
    pinned: r.pinned,
    active: r.active,
  };
}

function rowToCalendarEvent(r: PrismaCalendarEvent): CalendarEvent {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type as CalendarEventType,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    allDay: r.allDay,
    color: r.color,
    reminderEnabled: r.reminderEnabled,
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
