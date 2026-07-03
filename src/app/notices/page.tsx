import type { Metadata } from "next";
import { Notices } from "@/features/notices/notices";

export const metadata: Metadata = {
  title: "KTU Notices & Announcements — Latest University Updates",
  description:
    "Latest notices from APJ Abdul Kalam Technological University. Exam registrations, scholarships, placements, and academic updates.",
  alternates: { canonical: "/notices" },
  openGraph: {
    title: "KTU Notices & Announcements — Latest University Updates",
    description:
      "Latest notices from APJ Abdul Kalam Technological University. Exam registrations, scholarships, placements, and academic updates.",
    url: "/notices",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "KTU Notices & Announcements",
  description: "Latest notices from APJ Abdul Kalam Technological University.",
  isPartOf: { "@type": "WebSite", name: "KTU One", url: "https://ktuone.in" },
};

export default function NoticesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Notices />
    </>
  );
}
