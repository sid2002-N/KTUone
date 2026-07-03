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
  robots: { index: false, follow: true },
};

export default function SettingsPage() {
  return <Settings />;
}
