"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Download,
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

/**
 * SyllabusAdmin — list / upload / delete syllabus documents via
 * /api/v1/admin/syllabus and /api/v1/admin/syllabus/upload.
 *
 * Mirrors the papers-admin flow but with syllabus-specific fields
 * (version, modules).
 */
interface AdminSyllabusListItem {
  id: string;
  title: string;
  semester: number;
  branchCode: string;
  subjectCode: string;
  subjectName: string;
  version: string;
  fileUrl: string;
  lastUpdated: string;
  modules: number;
  deletedAt: string | null;
}

interface SyllabusResponse {
  syllabus: AdminSyllabusListItem[];
}
interface ApiError {
  error?: { code?: string; message?: string };
}

export function SyllabusAdmin({ adminKey }: { adminKey: string }) {
  const [items, setItems] = useState<AdminSyllabusListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [semester, setSemester] = useState<string>("1");
  const [branchCode, setBranchCode] = useState<string>("CSE");
  const [version, setVersion] = useState("v2019.1");
  const [modules, setModules] = useState<string>("5");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const authHeaders = { Authorization: `Bearer ${adminKey}` } as const;

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/syllabus", {
        headers: authHeaders,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(
          data?.error?.message ?? `Failed to load (HTTP ${res.status})`,
        );
      }
      const data = (await res.json()) as SyllabusResponse;
      setItems(data.syllabus ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load syllabus");
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
    setVersion("v2019.1");
    setModules("5");
    setFormError(null);
    const el = document.getElementById("s-file") as HTMLInputElement | null;
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
      fd.append("version", version.trim() || "v2019.1");
      fd.append("modules", modules);

      const res = await fetch("/api/v1/admin/syllabus/upload", {
        method: "POST",
        headers: authHeaders,
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

  async function handleDelete(id: string, syllabusTitle: string) {
    if (
      !confirm(
        `Delete syllabus "${syllabusTitle}"?\nThis soft-deletes the DB row AND removes the R2 object.`,
      )
    )
      return;
    try {
      const res = await fetch(
        `/api/v1/admin/syllabus?id=${encodeURIComponent(id)}`,
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
            <Upload className="size-4" /> Upload syllabus
          </CardTitle>
          <CardDescription>
            PDF only, max 20 MB. Stored in Cloudflare R2.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="s-file">PDF file</Label>
                <Input
                  id="s-file"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
                {file && (
                  <p className="text-xs text-muted-foreground">
                    {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="s-title">Title</Label>
                <Input
                  id="s-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CST301 Operating Systems — 2019 Scheme Syllabus"
                  maxLength={300}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="s-subject-code">Subject code</Label>
                <Input
                  id="s-subject-code"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="CST301"
                  maxLength={30}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="s-subject-name">Subject name</Label>
                <Input
                  id="s-subject-name"
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
                <Label htmlFor="s-version">Version</Label>
                <Input
                  id="s-version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="v2019.1"
                  maxLength={30}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="s-modules">Module count</Label>
                <Input
                  id="s-modules"
                  type="number"
                  min={1}
                  max={20}
                  value={modules}
                  onChange={(e) => setModules(e.target.value)}
                />
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
                    Upload syllabus
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
              <CardTitle>Existing syllabus</CardTitle>
              <CardDescription>
                {items.length} document{items.length === 1 ? "" : "s"} on
                record (including soft-deleted).
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
              No syllabus documents yet.
            </p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {items.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border bg-card/50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{s.title}</span>
                      {s.deletedAt && (
                        <Badge
                          variant="outline"
                          className="border-destructive/30 text-destructive"
                        >
                          deleted
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Badge variant="outline">{s.subjectCode}</Badge>
                      <Badge variant="outline">{s.branchCode}</Badge>
                      <Badge variant="outline">S{s.semester}</Badge>
                      <Badge variant="outline">{s.version}</Badge>
                      <span>· {s.modules} modules</span>
                      <span>
                        · updated{" "}
                        {new Date(s.lastUpdated).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!s.deletedAt && (
                      <a
                        href={`/api/v1/syllabus/${s.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        aria-label={`Download syllabus ${s.title}`}
                        title="Test download"
                      >
                        <Download className="size-4" />
                      </a>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void handleDelete(s.id, s.title)}
                      aria-label={`Delete syllabus ${s.title}`}
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
