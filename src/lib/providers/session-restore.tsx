"use client";

/**
 * SessionRestore — runs once on app boot to restore the user's session.
 *
 * On mount, calls `getStudentService().initialize()` which POSTs to
 * `/api/v1/refresh` using the httpOnly refresh cookie. If the refresh token
 * is still valid, the BFF issues a new access token cookie and returns 200;
 * the student's cached profile/results/CGPA are then loaded from the
 * `CachedStudentData` table (up to 24h old).
 *
 * If the refresh fails (expired, revoked, or no cookie), the user stays
 * logged out — they'll see the login dialog when they click the avatar.
 *
 * Mount this component once inside <Providers />.
 */
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { getStudentService } from "@/lib/providers/student";

export function SessionRestore() {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setInitializing = useAuthStore((s) => s.setInitializing);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      setInitializing(true);
      try {
        const service = getStudentService();
        const ok = await service.initialize();
        if (cancelled) return;

        if (ok) {
          // Session restored — fetch the cached profile.
          try {
            const profile = await service.getProfile();
            if (cancelled) return;
            // Build a minimal session object — the real access token lives
            // in the httpOnly cookie, not in JS. We mark isAuthenticated so
            // the UI can show the avatar + gated features.
            setSession({
              studentId: profile.id,
              registerNumber: profile.registerNumber,
              name: profile.name,
              accessToken: "in-cookie",
              refreshToken: "in-cookie",
              expiresAt: Date.now() + 60 * 60 * 1000, // optimistic — BFF will 401 if expired
              issuedAt: Date.now(),
            });
            setProfile(profile);
          } catch {
            // Profile fetch failed (e.g. cache expired) — leave logged out.
            // The user can click "Sync" to re-authenticate with KTU.
          }
        }
        // If `ok` is false, leave the user logged out. They'll see the login
        // dialog when they click the avatar. The lastSyncedAt persists in
        // localStorage so we can show "Last synced: Xh ago".
      } catch {
        // Network error — leave logged out. Don't crash the app.
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    void restore();

    return () => {
      cancelled = true;
    };
    // Intentionally only run once on mount.
  }, []);

  return null;
}
