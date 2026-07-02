"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Pin,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { KTUNotice, NoticeCategory, NoticePriority } from "@/lib/types";

/**
 * NoticesAdmin — list / create / delete notices via /api/v1/admin/notices.
 *
 * All fetches carry `Authorization: Bearer <adminKey>`. Create payload matches
 * the server's `NoticeInputSchema`. `publishedAt` defaults to "now".
 */
const CATEGORIES: NoticeCategory[] = [
  "Academic",
  "Examination",
  "Scholarship",
  "Placement",
  "Cultural",
  "General",
];

const PRIORITIES: NoticePriority[] = ["Pinned", "High", "Normal", "Low"];

interface NoticesResponse {
  notices: KTUNotice[];
}
interface ApiError {
  error?: { code?: string; message?: string };
}

export function NoticesAdmin({ adminKey }: { adminKey: string }) {
  const [items, setItems] = useState<KTUNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<NoticeCategory>("General");
  const [priority, setPriority] = useState<NoticePriority>("Normal");
  const [pinned, setPinned] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");
  const [tags, setTags] = useState("");
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
      const res = await fetch("/api/v1/admin/notices", { headers: authHeaders });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(
          data?.error?.message ?? `Failed to load (HTTP ${res.status})`,
        );
      }
      const data = (await res.json()) as NoticesResponse;
      setItems(data.notices ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notices");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setCategory("General");
    setPriority("Normal");
    setPinned(false);
    setExternalUrl("");
    setTags("");
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setFormError("Title and description are required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        pinned,
        publishedAt: new Date().toISOString(),
        externalUrl: externalUrl.trim() || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      const res = await fetch("/api/v1/admin/notices", {
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

  async function handleDelete(id: string, noticeTitle: string) {
    if (!confirm(`Delete notice "${noticeTitle}"? This soft-deletes it.`)) return;
    try {
      const res = await fetch(`/api/v1/admin/notices?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeaders,
      });
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
      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" /> New notice
          </CardTitle>
          <CardDescription>
            Posted notices appear in the student Notices feed immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="n-title">Title</Label>
                <Input
                  id="n-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. End-Sem Examination Registration Open"
                  maxLength={300}
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="n-desc">Description</Label>
                <Textarea
                  id="n-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notice body…"
                  rows={3}
                  maxLength={5000}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as NoticeCategory)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as NoticePriority)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="n-url">External URL (optional)</Label>
                <Input
                  id="n-url"
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://ktu.edu.in/…"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="n-tags">Tags (comma-separated)</Label>
                <Input
                  id="n-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="exam, registration, end-sem"
                />
              </div>

              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  id="n-pinned"
                  checked={pinned}
                  onCheckedChange={(v) => setPinned(v === true)}
                />
                <Label htmlFor="n-pinned" className="cursor-pointer">
                  Pin to top of the notices feed
                </Label>
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
                  "Create notice"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                Existing notices
              </CardTitle>
              <CardDescription>
                {items.length} notice{items.length === 1 ? "" : "s"} on record.
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
              No notices yet.
            </p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {items.map((n) => (
                <li
                  key={n.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border bg-card/50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {n.pinned && (
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        >
                          <Pin className="size-3" /> Pinned
                        </Badge>
                      )}
                      <span className="truncate font-medium">{n.title}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {n.description}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Badge variant="outline">{n.category}</Badge>
                      <Badge variant="outline">{n.priority}</Badge>
                      <span>
                        {new Date(n.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => void handleDelete(n.id, n.title)}
                    aria-label={`Delete notice ${n.title}`}
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
