"use server";

/**
 * Server-side search across multiple content kinds.
 *
 * Searches subjects, question papers, syllabus, notices, and calendar events
 * via Prisma `contains` queries. Each kind is capped so the merged result set
 * stays manageable; the most relevant (newest / most-viewed) rows bubble up
 * via the per-kind `orderBy`.
 *
 * Soft-deleted rows (papers, syllabus, notices) and inactive notices are
 * excluded — this is the public-facing search, not the admin panel.
 */
import { db } from "@/lib/db";
import type { SearchKind, SearchResult } from "@/lib/types";

const MAX_PER_KIND = 8;

export async function searchAll(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Prisma `contains` is case-sensitive on Postgres by default, so lower-case
  // the query and rely on `mode: "insensitive"` instead.
  const containsInsensitive = { contains: q, mode: "insensitive" as const };

  const [subjects, papers, syllabus, notices, calendar] = await Promise.all([
    db.subject.findMany({
      where: {
        OR: [
          { name: containsInsensitive },
          { code: containsInsensitive },
        ],
      },
      take: MAX_PER_KIND,
      orderBy: { code: "asc" },
    }),
    db.questionPaper.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: containsInsensitive },
          { subjectName: containsInsensitive },
          { subjectCode: containsInsensitive },
        ],
      },
      take: MAX_PER_KIND,
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    db.syllabus.findMany({
      where: {
        deletedAt: null,
        OR: [
          { subjectName: containsInsensitive },
          { subjectCode: containsInsensitive },
          { title: containsInsensitive },
        ],
      },
      take: MAX_PER_KIND,
      orderBy: [{ semester: "asc" }, { subjectCode: "asc" }],
    }),
    db.kTUNotice.findMany({
      where: {
        deletedAt: null,
        active: true,
        OR: [
          { title: containsInsensitive },
          { description: containsInsensitive },
        ],
      },
      take: MAX_PER_KIND,
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    }),
    db.calendarEvent.findMany({
      where: {
        OR: [
          { title: containsInsensitive },
          { description: containsInsensitive },
        ],
      },
      take: MAX_PER_KIND,
      orderBy: { startDate: "desc" },
    }),
  ]);

  const results: SearchResult[] = [];

  for (const s of subjects) {
    results.push({
      id: s.id,
      kind: "subject" as SearchKind,
      title: s.name,
      subtitle: s.code,
      meta: { branch: s.branchCode, semester: s.semester, credits: s.credits },
    });
  }

  for (const p of papers) {
    results.push({
      id: p.id,
      kind: "paper" as SearchKind,
      title: p.subjectName,
      subtitle: p.subjectCode,
      meta: {
        branch: p.branchCode,
        semester: p.semester,
        year: p.year,
        month: p.month,
      },
    });
  }

  for (const s of syllabus) {
    results.push({
      id: s.id,
      kind: "syllabus" as SearchKind,
      title: s.subjectName,
      subtitle: s.subjectCode,
      meta: { branch: s.branchCode, semester: s.semester, version: s.version },
    });
  }

  for (const n of notices) {
    results.push({
      id: n.id,
      kind: "notice" as SearchKind,
      title: n.title,
      subtitle: n.category,
      meta: { publishedAt: n.publishedAt.toISOString(), priority: n.priority },
    });
  }

  for (const c of calendar) {
    results.push({
      id: c.id,
      kind: "calendar" as SearchKind,
      title: c.title,
      subtitle: c.type,
      meta: { startDate: c.startDate.toISOString(), endDate: c.endDate.toISOString() },
    });
  }

  return results;
}
