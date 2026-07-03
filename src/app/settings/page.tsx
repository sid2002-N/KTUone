import type { Metadata } from "next";
import { Settings } from "@/features/settings/settings";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Manage your KTU One account, theme preferences, and supporter status.",
  alternates: { canonical: "/settings" },
  openGraph: {
    title: "Settings — KTU One",
    description:
      "Manage your KTU One account, theme preferences, and supporter status.",
    url: "/settings",
  },
  // noindex — don't let search engines index the settings page
  robots: { index: false, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Settings — KTU One",
  description: "Manage your KTU One account, theme preferences, and supporter status.",
  isPartOf: { "@type": "WebSite", name: "KTU One", url: "https://ktuone.in" },
};

export default function SettingsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Settings />
    </>
  );
}
