import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/lib/providers";

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
  title: "KTU One — Student Companion",
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
  },
  twitter: {
    card: "summary_large_image",
    title: "KTU One",
    description: "A student companion for KTU students.",
  },
};

export const viewport: Viewport = {
  themeColor: "#14100F",
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
        className={`${sourceSerif.variable} ${inter.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <SonnerToaster position="top-center" />
      </body>
    </html>
  );
}
