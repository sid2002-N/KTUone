"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { CalendarEvent, CalendarEventType } from "@/lib/types";

/**
 * CalendarAdmin — list / create / delete calendar events via
 * /api/v1/admin/calendar.
 *
 * `startDate` and `endDate` are accepted as `<input type="datetime-local">`
 * strings; we convert to ISO for the API. Single-day events get the same
 * value for both.
 */
const EVENT_TYPES: CalendarEventType[] = [
  "EXAM",
  "HOLIDAY",
  "RESULT",
  "REGISTRATION",
  "WORKSHOP",
  "DEADLINE",
  "EVENT",
];

interface EventsResponse {
  events: CalendarEvent[];
}
interface ApiError {
  error?: { code?: string; message?: string };
}

export function CalendarAdmin({ adminKey }: { adminKey: string }) {
  const [items, setItems] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CalendarEventType>("EVENT");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
      const res = await fetch("/api/v1/admin/calendar", { headers: authHeaders });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(
          data?.error?.message ?? `Failed to load (HTTP ${res.status})`,
        );
      }
      const data = (await res.json()) as EventsResponse;
      setItems(data.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events");
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
    setType("EVENT");
    setStartDate("");
    setEndDate("");
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !startDate || !endDate) {
      setFormError("Title, description, start and end dates are required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        type,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      };
      const res = await fetch("/api/v1/admin/calendar", {
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

  async function handleDelete(id: string, eventTitle: string) {
    if (!confirm(`Delete event "${eventTitle}"?`)) return;
    try {
      const res = await fetch(
        `/api/v1/admin/calendar?id=${encodeURIComponent(id)}`,
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
            <Plus className="size-4" /> New calendar event
          </CardTitle>
          <CardDescription>
            Events surface in the student Calendar tab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-title">Title</Label>
                <Input
                  id="c-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. B.Tech End-Semester Examinations"
                  maxLength={300}
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-desc">Description</Label>
                <Textarea
                  id="c-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Event details…"
                  rows={3}
                  maxLength={2000}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as CalendarEventType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="c-start">Start date &amp; time</Label>
                <Input
                  id="c-start"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="c-end">End date &amp; time</Label>
                <Input
                  id="c-end"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
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
                    Creating…
                  </>
                ) : (
                  "Create event"
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
              <CardTitle>Existing events</CardTitle>
              <CardDescription>
                {items.length} event{items.length === 1 ? "" : "s"} on record.
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
              No calendar events yet.
            </p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {items.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border bg-card/50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        aria-hidden
                        className="inline-block size-2.5 rounded-full"
                        style={{ background: ev.color }}
                      />
                      <span className="truncate font-medium">{ev.title}</span>
                      <Badge variant="outline">{ev.type}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {ev.description}
                    </p>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(ev.startDate).toLocaleString()} →{" "}
                      {new Date(ev.endDate).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => void handleDelete(ev.id, ev.title)}
                    aria-label={`Delete event ${ev.title}`}
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
