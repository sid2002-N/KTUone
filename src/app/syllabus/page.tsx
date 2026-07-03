import type { Metadata } from "next";
import { Syllabus } from "@/features/syllabus/syllabus";

export const metadata: Metadata = {
  title: "KTU Syllabus — Download Official B.Tech Syllabus",
  description:
    "Official KTU syllabus documents for every subject, branch, and semester. Download PDF syllabus for B.Tech CSE, EC, EEE, ME, IT — 2019 scheme.",
  alternates: { canonical: "/syllabus" },
  openGraph: {
    title: "KTU Syllabus — Download Official B.Tech Syllabus",
    description:
      "Official KTU syllabus documents for every subject, branch, and semester. Download PDF syllabus for B.Tech CSE, EC, EEE, ME, IT — 2019 scheme.",
    url: "/syllabus",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "KTU Syllabus",
  description:
    "Official KTU syllabus documents for every subject, branch, and semester.",
  isPartOf: { "@type": "WebSite", name: "KTU One", url: "https://ktuone.in" },
};

export default function SyllabusPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Syllabus />
    </>
  );
}
