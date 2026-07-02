"use client";

import { useState } from "react";
import { Lock, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/**
 * AdminLogin — single-step Bearer-key gate.
 *
 * Tests the provided key by calling `GET /api/v1/admin/notices` with an
 * `Authorization: Bearer <key>` header. On 200 → onLogin(key). On 401/403
 * → show inline error. On network error → show generic message.
 *
 * The key is intentionally NOT stored in localStorage — the admin must
 * re-enter it on every fresh load. This is a deliberate friction point so a
 * shared browser can't accidentally stay logged into the admin panel.
 */
export function AdminLogin({ onLogin }: { onLogin: (key: string) => void }) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError("Please enter the admin API key.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/notices", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${trimmed}`,
          "Content-Type": "application/json",
        },
      });
      if (res.status === 200) {
        onLogin(trimmed);
        return;
      }
      if (res.status === 401 || res.status === 403) {
        setError("Invalid admin key — please check and try again.");
        return;
      }
      const data = await res.json().catch(() => null);
      setError(
        data?.error?.message ?? `Login failed (HTTP ${res.status}).`,
      );
    } catch {
      setError("Network error — could not reach the admin API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="size-6" />
          </div>
          <CardTitle className="text-2xl">KTU One Admin</CardTitle>
          <CardDescription>
            Enter your admin API key to access the management console.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-key">Admin API Key</Label>
              <Input
                id="admin-key"
                type="password"
                autoComplete="off"
                placeholder="••••••••••••••••"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              The key is verified against{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                ADMIN_API_KEY
              </code>
              .
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
