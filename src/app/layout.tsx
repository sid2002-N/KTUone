import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/lib/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KTU One — Everything a KTU Student Needs",
  description:
    "The ultimate academic companion for APJ Abdul Kalam Technological University students. SGPA/CGPA calculators, question papers, syllabus, notices, calendar — all in one premium app.",
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
    title: "KTU One — Everything a KTU Student Needs",
    description: "Premium academic companion for KTU students.",
    type: "website",
    siteName: "KTU One",
  },
  twitter: {
    card: "summary_large_image",
    title: "KTU One",
    description: "Premium academic companion for KTU students.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1620" },
  ],
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <SonnerToaster position="top-center" />
      </body>
    </html>
  );
}
