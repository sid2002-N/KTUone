"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useThemeStore } from "@/store/theme-store";
import { useSupporterStore } from "@/store/supporter-store";
import { getAdsProvider } from "@/lib/providers/ads";
import { AdSenseScript } from "@/lib/providers/adsense-script";
import { AdMobInitializer } from "@/lib/providers/admob-initializer";
import { SessionRestore } from "@/lib/providers/session-restore";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

function ThemeSync() {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    const root = document.documentElement;

    const apply = (resolved: "light" | "dark") => {
      // Our CSS: `:root` = dark (default), `.light` = light theme.
      // So we add `.light` for light mode, remove it for dark mode.
      if (resolved === "light") {
        root.classList.add("light");
        root.classList.remove("dark");
      } else {
        root.classList.remove("light");
        root.classList.add("dark");
      }
      // Update meta theme-color for mobile browser chrome
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", resolved === "light" ? "#EDE8E0" : "#111315");
      }
      useThemeStore.getState().setResolved(resolved);
    };

    if (mode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches ? "dark" : "light");
      const onChange = (e: MediaQueryListEvent) =>
        apply(e.matches ? "dark" : "light");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    apply(mode);
  }, [mode]);

  return null;
}

function SupporterAdsSync() {
  const isSupporter = useSupporterStore((s) => s.isSupporter);
  useEffect(() => {
    getAdsProvider().setEnabled(!isSupporter);
  }, [isSupporter]);
  return null;
}

/**
 * Ad layers mounted once at the app root.
 *
 * - <AdSenseScript />: no-op unless NEXT_PUBLIC_ADS_PROVIDER=adsense + a
 *   supporter is not signed in. Injects the AdSense script tag into <head>.
 * - <AdMobInitializer />: no-op unless NEXT_PUBLIC_ADS_PROVIDER=admob + the
 *   app is running in a Capacitor native shell. Shows the native banner at
 *   the configured position.
 *
 * Both render null and have no impact on bundle size or layout when their
 * activation conditions aren't met.
 */
function AdLayers() {
  return (
    <>
      <AdSenseScript />
      <AdMobInitializer />
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <ThemeSync />
        <SupporterAdsSync />
        <AdLayers />
        <SessionRestore />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
