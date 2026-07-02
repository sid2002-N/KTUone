"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ScrollToTop } from "@/components/ui-custom/scroll-to-top";
import {
  Home,
  Calculator,
  FileText,
  BookOpen,
  CalendarDays,
  Bell,
  Settings,
  Search,
  Heart,
  Moon,
  Sun,
  Menu,
  X,
  User,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useNavStore } from "@/store/nav-store";
import { useThemeStore } from "@/store/theme-store";
import { useSupporterStore } from "@/store/supporter-store";
import { useAuthStore } from "@/store/auth-store";
import { NAV_ITEMS, PRIMARY_NAV_KEYS, APP_NAME } from "@/lib/constants";
import type { NavKey } from "@/lib/constants";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { getAnalyticsProvider } from "@/lib/providers/analytics";
import { formatRelativeTime } from "@/lib/utils/calc";
import { SyncDialog } from "@/features/sync/sync-dialog";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Calculator,
  FileText,
  BookOpen,
  CalendarDays,
  Bell,
  Settings,
};

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const active = useNavStore((s) => s.active);
  const setActive = useNavStore((s) => s.set);
  const setSearchOpen = useNavStore((s) => s.setSearchOpen);
  const setSupportOpen = useNavStore((s) => s.setSupportOpen);
  const setLoginOpen = useNavStore((s) => s.setLoginOpen);
  const setSyncOpen = useNavStore((s) => s.setSyncOpen);
  const resolved = useThemeStore((s) => s.resolved);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const isSupporter = useSupporterStore((s) => s.isSupporter);
  const profile = useAuthStore((s) => s.profile);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);
  const [mobileMenu, setMobileMenu] = useState(false);

  const navigate = (key: NavKey) => {
    setActive(key);
    setMobileMenu(false);
    getAnalyticsProvider().track({
      name: "page_view",
      props: { path: key },
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ===== PREMIUM TOP NAVBAR ===== */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="navbar-premium">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            {/* Left: mobile menu + logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenu(true)}
                className="lg:hidden size-10 rounded-xl icon-btn-premium flex items-center justify-center"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </button>
              <button
                onClick={() => navigate("dashboard")}
                className="flex items-center gap-2.5 no-tap-highlight"
              >
                <Logo size={32} withWordmark />
              </button>
            </div>

            {/* Center: desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = ICONS[item.icon] ?? Home;
                const isActive = active === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.key)}
                    className={cn(
                      "nav-btn-premium relative px-3.5 py-2 rounded-full text-sm font-medium flex items-center gap-2",
                      isActive
                        ? "active"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="size-10 rounded-xl icon-btn-premium flex items-center justify-center"
                aria-label="Search"
              >
                <Search className="size-5" />
              </button>

              {/* Theme toggle */}
              <button
                onClick={() => {
                  toggleTheme();
                  getAnalyticsProvider().track({
                    name: "theme_changed",
                    props: { theme: resolved === "light" ? "dark" : "light" },
                  });
                }}
                className="size-10 rounded-xl icon-btn-premium flex items-center justify-center"
                aria-label="Toggle theme"
              >
                {resolved === "light" ? (
                  <Moon className="size-5" />
                ) : (
                  <Sun className="size-5" />
                )}
              </button>

              {/* Supporter pill / button */}
              {isSupporter ? (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full supporter-pill-premium text-primary text-xs font-medium">
                  <Heart className="size-3.5" fill="currentColor" />
                  Supporter
                </div>
              ) : (
                <button
                  onClick={() => setSupportOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition shadow-soft"
                >
                  <Heart className="size-3.5" fill="currentColor" />
                  Support
                </button>
              )}

              {/* Sync button — only when authenticated */}
              {isAuthenticated && (
                <button
                  onClick={() => setSyncOpen(true)}
                  className="size-10 rounded-xl icon-btn-premium flex items-center justify-center relative group"
                  aria-label="Sync fresh data from KTU"
                  title={
                    lastSyncedAt
                      ? `Last synced ${formatRelativeTime(lastSyncedAt)} — click to sync fresh data`
                      : "Sync fresh data from KTU"
                  }
                >
                  <RefreshCw className="size-5 text-muted-foreground group-hover:text-foreground transition" />
                  {lastSyncedAt && (
                    <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 border border-background" />
                  )}
                </button>
              )}

              {/* Avatar / Login */}
              {profile ? (
                <button
                  onClick={() => navigate("settings")}
                  className="avatar-premium size-9 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  aria-label="Profile"
                  title={profile.name}
                >
                  {profile.avatarInitials}
                </button>
              ) : (
                <button
                  onClick={() => setLoginOpen(true)}
                  className="size-9 rounded-full bg-secondary icon-btn-premium flex items-center justify-center"
                  aria-label="Login"
                >
                  <User className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===== BODY: sidebar + main ===== */}
      <div className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 flex gap-6 py-6">
        {/* ===== PREMIUM SIDEBAR — desktop ===== */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-24 space-y-6">
            {/* Main navigation */}
            <div>
              <p className="sidebar-section-label">Navigate</p>
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = ICONS[item.icon] ?? Home;
                  const isActive = active === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => navigate(item.key)}
                      className={cn(
                        "sidebar-item-premium w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-left",
                        isActive
                          ? "active text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick actions */}
            <div>
              <p className="sidebar-section-label">Quick Actions</p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setActive("calculators");
                    getAnalyticsProvider().track({
                      name: "page_view",
                      props: { path: "calculators" },
                    });
                  }}
                  className="quick-action-card w-full p-3.5 rounded-2xl text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="size-4" />
                    <span className="text-sm font-semibold">Calculators</span>
                  </div>
                  <p className="text-xs opacity-80">SGPA · CGPA · Attendance</p>
                </button>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <Search className="size-4" />
                  Search
                  <span className="ml-auto text-[10px] text-muted-foreground/60">⌘K</span>
                </button>
              </div>
            </div>

            {/* Support CTA — only for non-supporters */}
            {!isSupporter && (
              <div className="pt-2">
                <button
                  onClick={() => setSupportOpen(true)}
                  className="w-full p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-left hover:opacity-95 transition shadow-soft"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="size-4" fill="currentColor" />
                    <span className="text-sm font-semibold">Support KTU One</span>
                  </div>
                  <p className="text-xs opacity-90">Remove ads · ₹99 lifetime</p>
                </button>
              </div>
            )}

            {/* Sync status — when authenticated */}
            {isAuthenticated && lastSyncedAt && (
              <div className="px-3.5 py-2.5 rounded-xl bg-secondary/40">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Last Synced
                  </span>
                </div>
                <p className="text-xs text-foreground/70 ml-3.5">
                  {formatRelativeTime(lastSyncedAt)}
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 pb-24 lg:pb-6">{children}</main>
      </div>

      {/* ===== PREMIUM BOTTOM NAV — mobile ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 safe-bottom">
        <div className="bottom-nav-premium px-2 py-2">
          <div className="flex items-center justify-around max-w-md mx-auto">
            {PRIMARY_NAV_KEYS.map((key) => {
              const item = NAV_ITEMS.find((i) => i.key === key)!;
              const Icon = ICONS[item.icon] ?? Home;
              const isActive = active === key;
              return (
                <button
                  key={key}
                  onClick={() => navigate(key)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-colors min-w-[58px]",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="bottom-nav-dot"
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ===== PREMIUM MOBILE MENU — slide-in ===== */}
      <AnimatePresence>
        {mobileMenu && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenu(false)}
            />
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-72 mobile-menu-premium p-5 flex flex-col overflow-y-auto"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="flex items-center justify-between mb-6">
                <Logo size={32} withWordmark />
                <button
                  onClick={() => setMobileMenu(false)}
                  className="size-9 rounded-xl icon-btn-premium flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Navigate section */}
              <p className="sidebar-section-label">Navigate</p>
              <div className="space-y-1 mb-6">
                {NAV_ITEMS.map((item) => {
                  const Icon = ICONS[item.icon] ?? Home;
                  const isActive = active === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => navigate(item.key)}
                      className={cn(
                        "sidebar-item-premium w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-left",
                        isActive
                          ? "active text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Quick actions */}
              <p className="sidebar-section-label">Quick Actions</p>
              <div className="space-y-2 mb-6">
                <button
                  onClick={() => navigate("calculators")}
                  className="quick-action-card w-full p-3.5 rounded-2xl text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="size-4" />
                    <span className="text-sm font-semibold">Calculators</span>
                  </div>
                  <p className="text-xs opacity-80">SGPA · CGPA · Attendance</p>
                </button>
              </div>

              {/* Support CTA */}
              {!isSupporter && (
                <button
                  onClick={() => {
                    setMobileMenu(false);
                    setSupportOpen(true);
                  }}
                  className="mt-auto w-full p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="size-4" fill="currentColor" />
                    <span className="text-sm font-semibold">Support KTU One</span>
                  </div>
                  <p className="text-xs opacity-90">Remove ads · ₹99 lifetime</p>
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ScrollToTop />
      <SyncDialog />
    </div>
  );
}
