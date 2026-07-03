"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ScrollToTop } from "@/components/ui-custom/scroll-to-top";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";
import { useState } from "react";
import { useNavStore } from "@/store/nav-store";
import { useThemeStore } from "@/store/theme-store";
import { useSupporterStore } from "@/store/supporter-store";
import { useAuthStore } from "@/store/auth-store";
import { NAV_ITEMS, PRIMARY_NAV_KEYS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getAnalyticsProvider } from "@/lib/providers/analytics";
import { formatRelativeTime } from "@/lib/utils/calc";
import { hapticSync } from "@/lib/utils/haptics";
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

/**
 * AppShell — wraps all pages with nav bar (desktop), bottom nav (mobile),
 * and global overlays. Active nav state is derived from usePathname().
 * useNavStore is kept ONLY for modal/overlay state (login, sync, search,
 * support curtain).
 */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
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

  const navigate = (href: string) => {
    hapticSync("light");
    router.push(href);
    setMobileMenu(false);
    getAnalyticsProvider().track({
      name: "page_view",
      props: { path: href },
    });
  };

  // Determine active nav item from pathname
  const getActiveItem = () => {
    return NAV_ITEMS.find(
      (item) =>
        item.href === pathname ||
        (item.href !== "/" && pathname.startsWith(item.href)),
    );
  };
  const activeItem = getActiveItem();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ===== TOP BAR — liquid glass ===== */}
      <header className="sticky top-0 z-40 safe-top liquid-glass-nav">
        <div className="max-w-6xl mx-auto px-5 md:px-8 flex items-center justify-between h-16 relative z-10">
          {/* Left: logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenu(true)}
              className="md:hidden size-9 rounded-md flex items-center justify-center hover:bg-secondary transition-colors"
              aria-label="Open menu"
            >
              <Menu className="size-5 text-muted-foreground" />
            </button>
            <Link href="/" className="flex items-center gap-2.5 no-tap-highlight">
              <div className="w-8 h-8 rounded-[9px] flex items-center justify-center font-serif text-[15px] font-semibold bg-primary text-primary-foreground">
                K
              </div>
              <div className="leading-tight hidden sm:block">
                <div className="text-[14px] font-medium">KTU One</div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  Student companion
                </div>
              </div>
            </Link>
          </div>

          {/* Center: desktop nav (tab style with Link) */}
          <nav className="hidden md:flex items-center gap-7 text-[13.5px]">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === pathname ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => hapticSync("light")}
                  className={cn("tab-btn pb-1", isActive && "active")}
                >
                  {item.label}
                  <div className="tab-underline mt-1" />
                </Link>
              );
            })}
          </nav>

          {/* Right: actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 text-[12.5px] font-mono px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:border-[#4a3e30] transition-colors"
            >
              <Search className="size-3.5" />
              <span className="hidden lg:inline">Search</span>
              <span className="text-[color:var(--text-faint)] hidden lg:inline">⌘K</span>
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden size-9 rounded-md flex items-center justify-center hover:bg-secondary transition-colors"
              aria-label="Search"
            >
              <Search className="size-5 text-muted-foreground" />
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
              className="size-9 rounded-md flex items-center justify-center hover:bg-secondary transition-colors"
              aria-label="Toggle theme"
            >
              {resolved === "light" ? (
                <Moon className="size-5 text-muted-foreground" />
              ) : (
                <Sun className="size-5 text-muted-foreground" />
              )}
            </button>

            {/* Sync — only when authenticated */}
            {isAuthenticated && (
              <button
                onClick={() => setSyncOpen(true)}
                className="size-9 rounded-md flex items-center justify-center hover:bg-secondary transition-colors relative group"
                aria-label="Sync"
                title={
                  lastSyncedAt
                    ? `Last synced ${formatRelativeTime(lastSyncedAt)}`
                    : "Sync"
                }
              >
                <RefreshCw className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                {lastSyncedAt && (
                  <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-primary border border-background" />
                )}
              </button>
            )}

            {/* Avatar / Login */}
            {profile ? (
              <Link
                href="/settings"
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-[12px] font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                aria-label="Profile"
                title={profile.name}
              >
                {profile.avatarInitials}
              </Link>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                aria-label="Login"
              >
                <User className="size-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ===== BODY — single column, no sidebar ===== */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-5 md:px-8 pt-8 pb-28 md:pb-10">
        {children}
      </div>

      {/* ===== BOTTOM NAV — liquid glass (mobile) ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 safe-bottom liquid-glass-bottom">
        <div className="flex items-center justify-around max-w-md mx-auto relative z-10">
          {PRIMARY_NAV_KEYS.map((key) => {
            const item = NAV_ITEMS.find((i) => i.key === key)!;
            const Icon = ICONS[item.icon] ?? Home;
            const isActive =
              item.href === pathname ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <button
                key={key}
                onClick={() => navigate(item.href)}
                className={cn(
                  "bottom-nav-btn flex flex-col items-center gap-1 px-3 py-2 min-w-[58px]",
                  isActive && "active",
                )}
              >
                <Icon className="size-5" />
                <span className="text-[10.5px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ===== MOBILE MENU — slide-in ===== */}
      <AnimatePresence>
        {mobileMenu && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenu(false)}
            />
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-72 bg-card p-5 flex flex-col overflow-y-auto border-r border-border"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[9px] flex items-center justify-center font-serif text-[15px] font-semibold bg-primary text-primary-foreground">
                    K
                  </div>
                  <span className="text-[14px] font-medium">KTU One</span>
                </div>
                <button
                  onClick={() => setMobileMenu(false)}
                  className="size-9 rounded-md flex items-center justify-center hover:bg-secondary transition-colors"
                  aria-label="Close"
                >
                  <X className="size-5 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = ICONS[item.icon] ?? Home;
                  const isActive =
                    item.href === pathname ||
                    (item.href !== "/" && pathname.startsWith(item.href));
                  return (
                    <button
                      key={item.key}
                      onClick={() => navigate(item.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3.5 py-3 rounded-md text-sm font-medium text-left transition-colors",
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              {!isSupporter && (
                <button
                  onClick={() => {
                    setMobileMenu(false);
                    setSupportOpen(true);
                  }}
                  className="mt-auto w-full p-4 rounded-md border border-border text-left hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Support KTU One</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Remove ads · ₹99 lifetime</p>
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
