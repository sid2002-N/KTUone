"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BRANCHES, SEMESTERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * TimetablesAdmin — list / create / delete exam timetables via
 * /api/v1/admin/timetables.
 *
 * NOTE: The existing `TimetableInputSchema` accepts {title, semester,
 * branchCode, fileUrl, isActive}. The admin UI exposes richer fields
 * (examType, academicYear, dynamic entry rows) for future schema expansion
 * — they're included in the POST body for forward-compat but currently
 * ignored by the server's Zod parse. We synthesize a deterministic
 * `fileUrl` placeholder key (no PDF upload is wired in this route yet).
 */
const EXAM_TYPES = ["END_SEM", "SERIES_1", "SERIES_2", "MODEL"] as const;
type ExamTypeOption = (typeof EXAM_TYPES)[number];

const SESSIONS = ["FN", "AN"] as const;
type Session = (typeof SESSIONS)[number];

interface Entry {
  id: string;
  date: string;
  session: Session;
  subjectCode: string;
  subjectName: string;
}

interface Timetable {
  id: string;
  semester: number;
  branchCode: string;
  title: string;
  fileUrl: string;
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TimetablesResponse {
  timetables: Timetable[];
}
interface ApiError {
  error?: { code?: string; message?: string };
}

function makeEntry(): Entry {
  return {
    id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: "",
    session: "FN",
    subjectCode: "",
    subjectName: "",
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function TimetablesAdmin({ adminKey }: { adminKey: string }) {
  const [items, setItems] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [examType, setExamType] = useState<ExamTypeOption>("END_SEM");
  const [semester, setSemester] = useState<string>("1");
  const [branchCode, setBranchCode] = useState<string>("ALL");
  const [academicYear, setAcademicYear] = useState<string>(
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  );
  const [entries, setEntries] = useState<Entry[]>([makeEntry()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const authHeaders = {
    Authorization: `Bearer ${adminKey}`,
    "Content-Type": "application/json",
  } as const;

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/timetables", {
        headers: authHeaders,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(
          data?.error?.message ?? `Failed to load (HTTP ${res.status})`,
        );
      }
      const data = (await res.json()) as TimetablesResponse;
      setItems(data.timetables ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load timetables");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  function resetForm() {
    setTitle("");
    setExamType("END_SEM");
    setSemester("1");
    setBranchCode("ALL");
    setAcademicYear(
      `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    );
    setEntries([makeEntry()]);
    setFormError(null);
  }

  function updateEntry(id: string, patch: Partial<Entry>) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
  }
  function addEntry() {
    setEntries((prev) => [...prev, makeEntry()]);
  }
  function removeEntry(id: string) {
    setEntries((prev) => (prev.length === 1 ? prev : prev.filter((e) => e.id !== id)));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    const validEntries = entries.filter(
      (en) => en.date && en.subjectCode.trim() && en.subjectName.trim(),
    );
    if (validEntries.length === 0) {
      setFormError(
        "Add at least one valid entry (date, subject code, subject name).",
      );
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      // The current API requires `fileUrl`. We synthesize a deterministic
      // placeholder key — no PDF is uploaded in this flow (the route's POST
      // handler doesn't accept multipart for timetables).
      const fileUrl = `admin-timetable-${Date.now()}-${slugify(title)}`;

      const body = {
        title: title.trim(),
        examType, // ignored by current API; included for forward-compat
        academicYear, // ignored by current API; included for forward-compat
        semester: Number(semester),
        branchCode, // "ALL" or a real branch code
        fileUrl,
        isActive: true,
        entries: validEntries.map((en) => ({
          date: en.date,
          session: en.session,
          subjectCode: en.subjectCode.trim(),
          subjectName: en.subjectName.trim(),
        })), // ignored by current API; included for forward-compat
      };

      const res = await fetch("/api/v1/admin/timetables", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(
          data?.error?.message ?? `Create failed (HTTP ${res.status})`,
        );
      }
      resetForm();
      await fetchList();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, ttTitle: string) {
    if (!confirm(`Delete timetable "${ttTitle}"?`)) return;
    try {
      const res = await fetch(
        `/api/v1/admin/timetables?id=${encodeURIComponent(id)}`,
        { method: "DELETE", headers: authHeaders },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(
          data?.error?.message ?? `Delete failed (HTTP ${res.status})`,
        );
      }
      await fetchList();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" /> New exam timetable
          </CardTitle>
          <CardDescription>
            Define a timetable with one or more exam entries. Creating a new
            timetable for a branch+semester auto-archives the previous one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="t-title">Title</Label>
                <Input
                  id="t-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. B.Tech S4 End-Sem Exam — May 2025"
                  maxLength={300}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Exam type</Label>
                <Select
                  value={examType}
                  onValueChange={(v) => setExamType(v as ExamTypeOption)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="t-acad-year">Academic year</Label>
                <Input
                  id="t-acad-year"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2024-2025"
                />
              </div>

              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Semester {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={branchCode} onValueChange={setBranchCode}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">ALL branches</SelectItem>
                    {BRANCHES.map((b) => (
                      <SelectItem key={b.code} value={b.code}>
                        {b.code} — {b.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dynamic entry rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Exam entries</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addEntry}
                >
                  <Plus className="size-4" />
                  Add row
                </Button>
              </div>

              <div className="space-y-2">
                {entries.map((en, idx) => (
                  <div
                    key={en.id}
                    className="grid grid-cols-1 gap-2 rounded-md border border-border bg-card/50 p-3 sm:grid-cols-[auto_1fr_1fr_1fr_1fr_auto]"
                  >
                    <div className="hidden items-center text-xs font-medium text-muted-foreground sm:flex sm:items-center">
                      #{idx + 1}
                    </div>
                    <Input
                      type="date"
                      value={en.date}
                      onChange={(e) =>
                        updateEntry(en.id, { date: e.target.value })
                      }
                      aria-label={`Entry ${idx + 1} date`}
                    />
                    <Select
                      value={en.session}
                      onValueChange={(v) =>
                        updateEntry(en.id, { session: v as Session })
                      }
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-label={`Entry ${idx + 1} session`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SESSIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s === "FN" ? "FN — Forenoon" : "AN — Afternoon"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={en.subjectCode}
                      onChange={(e) =>
                        updateEntry(en.id, { subjectCode: e.target.value })
                      }
                      placeholder="CST301"
                      aria-label={`Entry ${idx + 1} subject code`}
                    />
                    <Input
                      value={en.subjectName}
                      onChange={(e) =>
                        updateEntry(en.id, { subjectName: e.target.value })
                      }
                      placeholder="Operating Systems"
                      aria-label={`Entry ${idx + 1} subject name`}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(
                        "text-destructive hover:bg-destructive/10 hover:text-destructive",
                        entries.length === 1 && "pointer-events-none opacity-30",
                      )}
                      onClick={() => removeEntry(en.id)}
                      aria-label={`Remove entry ${idx + 1}`}
                      disabled={entries.length === 1}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create timetable"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Existing timetables</CardTitle>
              <CardDescription>
                {items.length} timetable{items.length === 1 ? "" : "s"} on
                record (active + archived).
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchList()}
              disabled={loading}
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="ml-2">Loading…</span>
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No timetables yet.
            </p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {items.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border bg-card/50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{t.title}</span>
                      {t.isActive ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        >
                          active
                        </Badge>
                      ) : (
                        <Badge variant="outline">archived</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Badge variant="outline">{t.branchCode}</Badge>
                      <Badge variant="outline">S{t.semester}</Badge>
                      <span>
                        · updated {new Date(t.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => void handleDelete(t.id, t.title)}
                    aria-label={`Delete timetable ${t.title}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
