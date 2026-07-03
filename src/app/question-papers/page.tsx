import type { Metadata } from "next";
import { Papers } from "@/features/papers/papers";

export const metadata: Metadata = {
  title: "KTU Question Papers — Browse & Download Previous Papers",
  description:
    "Browse and download previous year KTU question papers organized by semester and subject. B.Tech CSE, EC, EEE, ME, IT papers with exam type filters.",
  alternates: { canonical: "/question-papers" },
  openGraph: {
    title: "KTU Question Papers | KTU One",
    description:
      "Browse and download previous year KTU question papers organized by semester and subject.",
    url: "/question-papers",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "KTU Question Papers",
  description:
    "Browse and download previous KTU question papers by branch, semester, and year.",
  isPartOf: { "@type": "WebSite", name: "KTU One", url: "https://ktuone.in" },
};

export default function QuestionPapersPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Papers />
    </>
  );
}
