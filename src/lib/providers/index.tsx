"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useThemeStore } from "@/store/theme-store";
import { useSupporterStore } from "@/store/supporter-store";
import { getAdsProvider } from "@/lib/providers/ads";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

function ThemeSync() {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    const root = document.documentElement;

    const apply = (resolved: "light" | "dark") => {
      if (resolved === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
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
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
