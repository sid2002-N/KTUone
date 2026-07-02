"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
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
import type { ExamType } from "@/lib/types";

/**
 * PapersAdmin — list / upload / delete question papers via
 * /api/v1/admin/papers and /api/v1/admin/papers/upload.
 *
 * Uploads use multipart/form-data. The browser sets the multipart boundary
 * automatically — we MUST NOT set `Content-Type` ourselves; only the
 * Authorization header is added.
 */
const EXAM_TYPES: ExamType[] = ["END_SEM", "SERIES_1", "SERIES_2", "MODEL"];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

interface AdminPaperListItem {
  id: string;
  title: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  branchCode: string;
  year: number;
  month: number;
  examType: ExamType;
  fileUrl: string;
  fileSizeBytes: number;
  pageCount: number;
  downloads: number;
  views: number;
  uploadedAt: string;
  deletedAt: string | null;
}

interface PapersResponse {
  papers: AdminPaperListItem[];
}
interface ApiError {
  error?: { code?: string; message?: string };
}

function formatBytes(n: number): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function PapersAdmin({ adminKey }: { adminKey: string }) {
  const [items, setItems] = useState<AdminPaperListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [semester, setSemester] = useState<string>("1");
  const [branchCode, setBranchCode] = useState<string>("CSE");
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [month, setMonth] = useState<string>("1");
  const [examType, setExamType] = useState<ExamType>("END_SEM");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const authHeaders = { Authorization: `Bearer ${adminKey}` } as const;

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/papers", { headers: authHeaders });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(
          data?.error?.message ?? `Failed to load (HTTP ${res.status})`,
        );
      }
      const data = (await res.json()) as PapersResponse;
      setItems(data.papers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load papers");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  function resetForm() {
    setFile(null);
    setTitle("");
    setSubjectCode("");
    setSubjectName("");
    setSemester("1");
    setBranchCode("CSE");
    setYear(String(new Date().getFullYear()));
    setMonth("1");
    setExamType("END_SEM");
    setFormError(null);
    // Reset the file input element so the same file can be re-selected.
    const el = document.getElementById("p-file") as HTMLInputElement | null;
    if (el) el.value = "";
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setFormError("Please choose a PDF file to upload.");
      return;
    }
    if (file.type && file.type !== "application/pdf") {
      setFormError("Only PDF files are accepted.");
      return;
    }
    if (!title.trim() || !subjectCode.trim() || !subjectName.trim()) {
      setFormError("Title, subject code and subject name are required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title.trim());
      fd.append("subjectCode", subjectCode.trim());
      fd.append("subjectName", subjectName.trim());
      fd.append("semester", semester);
      fd.append("branchCode", branchCode);
      fd.append("year", year);
      fd.append("month", month);
      fd.append("examType", examType);

      const res = await fetch("/api/v1/admin/papers/upload", {
        method: "POST",
        headers: authHeaders, // NO Content-Type — browser sets multipart boundary
        body: fd,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(
          data?.error?.message ?? `Upload failed (HTTP ${res.status})`,
        );
      }
      resetForm();
      await fetchList();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, paperTitle: string) {
    if (
      !confirm(
        `Delete paper "${paperTitle}"?\nThis soft-deletes the DB row AND removes the R2 object.`,
      )
    )
      return;
    try {
      const res = await fetch(
        `/api/v1/admin/papers?id=${encodeURIComponent(id)}`,
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
            <Upload className="size-4" /> Upload question paper
          </CardTitle>
          <CardDescription>
            PDF only, max 20 MB. Stored in Cloudflare R2.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-file">PDF file</Label>
                <Input
                  id="p-file"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
                {file && (
                  <p className="text-xs text-muted-foreground">
                    {file.name} · {formatBytes(file.size)}
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-title">Title</Label>
                <Input
                  id="p-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CST301 Operating Systems — End-Sem Dec 2024"
                  maxLength={300}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="p-subject-code">Subject code</Label>
                <Input
                  id="p-subject-code"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="CST301"
                  maxLength={30}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="p-subject-name">Subject name</Label>
                <Input
                  id="p-subject-name"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Operating Systems"
                  maxLength={200}
                  required
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
                    {BRANCHES.map((b) => (
                      <SelectItem key={b.code} value={b.code}>
                        {b.code} — {b.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="p-year">Year</Label>
                <Input
                  id="p-year"
                  type="number"
                  min={2000}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {new Date(2000, m - 1, 1).toLocaleString("en", {
                          month: "long",
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Exam type</Label>
                <Select
                  value={examType}
                  onValueChange={(v) => setExamType(v as ExamType)}
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
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Upload paper
                  </>
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
              <CardTitle>Existing papers</CardTitle>
              <CardDescription>
                {items.length} paper{items.length === 1 ? "" : "s"} on record
                (including soft-deleted).
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
              No question papers yet.
            </p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {items.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border bg-card/50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{p.title}</span>
                      {p.deletedAt && (
                        <Badge
                          variant="outline"
                          className="border-destructive/30 text-destructive"
                        >
                          deleted
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Badge variant="outline">{p.subjectCode}</Badge>
                      <Badge variant="outline">{p.branchCode}</Badge>
                      <Badge variant="outline">S{p.semester}</Badge>
                      <Badge variant="outline">
                        {p.examType.replace("_", " ")}
                      </Badge>
                      <span>
                        {String(p.month).padStart(2, "0")}/{p.year}
                      </span>
                      <span>· {formatBytes(p.fileSizeBytes)}</span>
                      <span>· ↓ {p.downloads}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!p.deletedAt && (
                      <a
                        href={`/api/v1/papers/${p.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        aria-label={`Download paper ${p.title}`}
                        title="Test download"
                      >
                        <Download className="size-4" />
                      </a>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void handleDelete(p.id, p.title)}
                      aria-label={`Delete paper ${p.title}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
