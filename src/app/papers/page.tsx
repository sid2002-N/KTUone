import type { Metadata } from "next";
import { Papers } from "@/features/papers/papers";

export const metadata: Metadata = {
  title: "KTU Question Papers — Browse & Download Previous Papers",
  description:
    "Download previous KTU question papers by branch, semester, and year. B.Tech CSE, EC, EEE, ME, IT papers with exam type filters.",
  alternates: { canonical: "/papers" },
  openGraph: {
    title: "KTU Question Papers — Browse & Download Previous Papers",
    description:
      "Download previous KTU question papers by branch, semester, and year. B.Tech CSE, EC, EEE, ME, IT papers with exam type filters.",
    url: "/papers",
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

export default function PapersPage() {
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
