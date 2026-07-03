import type { Metadata } from "next";
import { Dashboard } from "@/features/dashboard/dashboard";

export const metadata: Metadata = {
  title: "KTU One — Student Companion for APJ Abdul Kalam University",
  description:
    "Track CGPA, browse question papers, check notices, and manage your academic life at KTU. Free calculators, syllabus downloads, and exam timetables.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "KTU One — Student Companion for APJ Abdul Kalam University",
    description:
      "Track CGPA, browse question papers, check notices, and manage your academic life at KTU. Free calculators, syllabus downloads, and exam timetables.",
    url: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalApplication",
  name: "KTU One",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web, Android, iOS",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  description:
    "Student companion for APJ Abdul Kalam Technological University — calculators, question papers, syllabus, notices, calendar.",
  url: "https://ktuone.in",
  publisher: {
    "@type": "Organization",
    name: "KTU One",
    url: "https://ktuone.in",
    logo: {
      "@type": "ImageObject",
      url: "https://ktuone.in/icon-512.png",
      width: 512,
      height: 512,
    },
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Dashboard />
    </>
  );
}
