import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/lib/providers";
import { AppShell } from "@/components/layout/app-shell";
import { SupportCurtain } from "@/components/support/support-curtain";
import { LoginDialog } from "@/features/login/login-dialog";
import { SearchOverlay } from "@/features/search/search-overlay";

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "KTU One — Student Companion",
    template: "%s | KTU One",
  },
  description:
    "A student companion for APJ Abdul Kalam Technological University. Calculators, question papers, syllabus, calendar — built for clarity under exam stress.",
  keywords: [
    "KTU",
    "KTU One",
    "APJ Abdul Kalam Technological University",
    "SGPA Calculator",
    "CGPA Calculator",
    "KTU Question Papers",
    "KTU Syllabus",
    "KTU Notices",
  ],
  authors: [{ name: "KTU One" }],
  applicationName: "KTU One",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KTU One",
  },
  openGraph: {
    title: "KTU One — Student Companion",
    description: "A student companion for KTU students.",
    type: "website",
    siteName: "KTU One",
    images: [
      {
        url: "https://ktuone.in/og-default.png",
        width: 1200,
        height: 630,
        alt: "KTU One — Student Companion for APJ Abdul Kalam Technological University",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KTU One",
    description: "A student companion for KTU students.",
    images: ["https://ktuone.in/og-default.png"],
  },
  metadataBase: new URL("https://ktuone.in"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  verification: {
    google: "XXXXXXX",
    other: {
      "msvalidate.01": "XXXXXXX",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#111315",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Blocking inline script — reads theme from localStorage and sets the
  // .light / .dark class on <html> BEFORE any CSS or React renders.
  // Placed at top of <body> (not <head>) because Next.js App Router
  // manages <head> internally — adding a manual <head> causes hydration issues.
  const themeScript = `
    (function() {
      try {
        var stored = localStorage.getItem('ktu_one:theme');
        var mode = 'system';
        if (stored) {
          var parsed = JSON.parse(stored);
          if (parsed && parsed.state && parsed.state.mode) {
            mode = parsed.state.mode;
          }
        }
        var isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        var root = document.documentElement;
        if (isDark) {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
      } catch (e) {}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sourceSerif.variable} ${inter.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Providers>
          <AppShell>
            <main>{children}</main>
          </AppShell>
          <SupportCurtain />
          <LoginDialog />
          <SearchOverlay />
        </Providers>
        <Toaster />
        <SonnerToaster position="top-center" />
      </body>
    </html>
  );
}
