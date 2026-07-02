"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  X,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavStore } from "@/store/nav-store";
import { useAuthStore } from "@/store/auth-store";
import { getStudentService } from "@/lib/providers/student";
import { getAnalyticsProvider } from "@/lib/providers/analytics";
import { getNotificationProvider } from "@/lib/providers/notification";
import type { StudentProfile } from "@/lib/types";

/**
 * SyncDialog — lets an authenticated user re-fetch fresh data from KTU.
 *
 * The student's register number is pre-filled from the auth store (we
 * persist it in localStorage after the first login). Only the password is
 * required — it's sent to the scraper, exchanged for a new session token,
 * then discarded (never stored).
 *
 * On success:
 *   - The scraper re-fetches profile + results + CGPA from app.ktu.edu.in
 *   - The CachedStudentData row is updated (fresh 24h TTL)
 *   - A new access token cookie is issued
 *   - lastSyncedAt is updated to "now"
 *   - TanStack Query caches are invalidated so the UI shows fresh data
 *
 * On failure:
 *   - Show the friendly error message (same branching as LoginDialog)
 *   - Keep the dialog open so the user can retry
 */
export function SyncDialog() {
  const open = useNavStore((s) => s.syncOpen);
  const setOpen = useNavStore((s) => s.setSyncOpen);
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLastSyncedAt = useAuthStore((s) => s.setLastSyncedAt);
  const rememberedRegisterNumber = useAuthStore(
    (s) => s.rememberedRegisterNumber,
  );
  const profile = useAuthStore((s) => s.profile);
  const prefersReduced = useReducedMotion();

  const [registerNumber, setRegisterNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill register number when dialog opens
  useEffect(() => {
    if (open) {
      setRegisterNumber(
        rememberedRegisterNumber ?? profile?.registerNumber ?? "",
      );
      setPassword("");
      setError(null);
      setSuccess(false);
    }
  }, [open, rememberedRegisterNumber, profile]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen, loading]);

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      // Re-login with the scraper to force a fresh data fetch.
      // This updates CachedStudentData with a new 24h TTL.
      const res = await getStudentService().login({
        registerNumber,
        password,
      });
      const session = {
        studentId: res.student.id,
        registerNumber: res.student.registerNumber,
        name: res.student.name,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        expiresAt: Date.now() + res.expiresIn * 1000,
        issuedAt: Date.now(),
      };
      setSession(session);
      setLastSyncedAt(new Date().toISOString());
      const freshProfile = await getStudentService().getProfile();
      setProfile(freshProfile satisfies StudentProfile);
      getAnalyticsProvider().track({
        name: "login_succeeded",
        props: { registerNumber },
      });
      setSuccess(true);
      getNotificationProvider().show({
        kind: "success",
        title: "Data synced!",
        message: "Your latest KTU data is now loaded.",
      });
      // Auto-close after 1.5s so the user sees the success state
      setTimeout(() => {
        setOpen(false);
      }, 1500);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code
          : "UNKNOWN";
      const rawMessage =
        err instanceof Error ? err.message : "Sync failed. Try again.";

      let friendlyMessage: string;
      let friendlyHint: string | undefined;

      switch (code) {
        case "AUTH_FAILED":
          friendlyMessage = "Invalid register number or password.";
          friendlyHint = "Double-check your KTU portal credentials and try again.";
          break;
        case "SCRAPE_FAILED":
          friendlyMessage = "KTU's portal is unavailable right now.";
          friendlyHint =
            "We couldn't reach app.ktu.edu.in. This is usually temporary — try again in a few minutes.";
          break;
        case "SCRAPER_UNAVAILABLE":
          friendlyMessage = "Our backend couldn't be reached.";
          friendlyHint = "Network issue between KTU One and the scraper. Try again shortly.";
          break;
        case "VALIDATION_FAILED":
          friendlyMessage = rawMessage;
          break;
        default:
          friendlyMessage = rawMessage;
      }

      setError(
        friendlyHint ? `${friendlyMessage}\n${friendlyHint}` : friendlyMessage,
      );
      getAnalyticsProvider().track({
        name: "login_failed",
        props: { reason: code },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loading && !success && setOpen(false)}
          />
          <motion.div
            className="relative w-full max-w-md glass-strong rounded-3xl shadow-floating overflow-hidden"
            initial={
              prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }
            }
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <button
              onClick={() => !loading && !success && setOpen(false)}
              className="absolute top-4 right-4 size-9 rounded-xl hover:bg-secondary flex items-center justify-center z-10"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>

            <div className="p-8 pt-10">
              {/* Hero */}
              <div className="flex flex-col items-center text-center mb-6">
                <Logo size={48} />
                <div className="flex items-end gap-1 mt-5">
                  <RefreshCw
                    className={`size-10 text-primary ${loading ? "animate-spin" : ""}`}
                  />
                </div>
                <h2 className="font-serif-display text-2xl tracking-tight mt-4">
                  Sync fresh data
                </h2>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xs italic">
                  Re-fetch your latest CGPA, results and profile from KTU.
                  Enter your password to confirm.
                </p>
              </div>

              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-8"
                >
                  <div className="size-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
                    <CheckCircle2 className="size-9 text-emerald-600" />
                  </div>
                  <p className="font-serif-display text-lg">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your data is now up to date.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSync} className="space-y-4">
                  <div>
                    <Label
                      htmlFor="sync-reg"
                      className="text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      Register Number
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="sync-reg"
                        value={registerNumber}
                        onChange={(e) => setRegisterNumber(e.target.value)}
                        placeholder="e.g. TVE21CS001"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        required
                        className="h-12 bg-background"
                      />
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="sync-pwd"
                      className="text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      KTU Password
                    </Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="sync-pwd"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Your KTU portal password"
                        required
                        className="pl-10 pr-10 h-12 bg-background"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm"
                    >
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5">
                        {error.split("\n").map((line, i) => (
                          <span
                            key={i}
                            className={i === 1 ? "text-xs opacity-80" : ""}
                          >
                            {line}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !registerNumber || password.length < 3}
                    className="w-full h-12 rounded-full shadow-soft text-base font-semibold"
                  >
                    {loading ? (
                      <>
                        <span className="size-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin mr-2" />
                        Syncing…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-4 mr-2" />
                        Sync now
                      </>
                    )}
                  </Button>
                </form>
              )}

              {!success && (
                <div className="mt-5 p-3 rounded-xl bg-secondary/40 text-[11px] text-muted-foreground text-center leading-relaxed flex items-center justify-center gap-1.5">
                  <Clock className="size-3.5" />
                  Your password is sent securely to our backend, used to fetch
                  your data, then discarded. We never store it.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
