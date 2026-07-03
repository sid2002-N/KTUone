"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthSession, StudentProfile } from "@/lib/types";

interface AuthState {
  session: AuthSession | null;
  profile: StudentProfile | null;
  isInitializing: boolean;
  isAuthenticated: boolean;
  /** ISO timestamp of the last successful scraper sync (login or manual sync). */
  lastSyncedAt: string | null;
  /** Stored register number for pre-filling the login dialog. Not secret. */
  rememberedRegisterNumber: string | null;

  setSession: (session: AuthSession | null) => void;
  setProfile: (profile: StudentProfile | null) => void;
  setInitializing: (v: boolean) => void;
  setLastSyncedAt: (iso: string | null) => void;
  setRememberedRegisterNumber: (regNo: string | null) => void;
  clear: () => void;
}

/**
 * Auth state store.
 *
 * `session` + `profile` are in-memory only (NOT persisted) — they're
 * reconstructed on app boot by `SessionRestore` calling `/api/v1/refresh`.
 *
 * `lastSyncedAt` + `rememberedRegisterNumber` ARE persisted to localStorage
 * — they survive page reloads so the UI can show "Last synced: 3h ago" and
 * pre-fill the login dialog's register number field.
 *
 * We do NOT persist the session tokens here. Access tokens live in httpOnly
 * cookies (set by the BFF on login/refresh) and are never readable by JS.
 * Refresh tokens are bcrypt-hashed in the DB, not stored client-side.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      profile: null,
      isInitializing: false,
      isAuthenticated: false,
      lastSyncedAt: null,
      rememberedRegisterNumber: null,

      setSession: (session) =>
        set({
          session,
          isAuthenticated: !!session && session.expiresAt > Date.now(),
        }),
      setProfile: (profile) => set({ profile }),
      setInitializing: (isInitializing) => set({ isInitializing }),
      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
      setRememberedRegisterNumber: (rememberedRegisterNumber) =>
        set({ rememberedRegisterNumber }),
      clear: () =>
        set({
          session: null,
          profile: null,
          isAuthenticated: false,
          isInitializing: false,
        }),
    }),
    {
      name: "ktu_one:auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields — session + profile are reconstructed on
      // boot via /api/v1/refresh, so don't persist them (avoids stale data
      // if the refresh token has expired).
      partialize: (state) => ({
        lastSyncedAt: state.lastSyncedAt,
        rememberedRegisterNumber: state.rememberedRegisterNumber,
      }),
      skipHydration: true,
    },
  ),
);
