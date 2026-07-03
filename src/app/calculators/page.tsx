import type { Metadata } from "next";
import { Calculators } from "@/features/calculators/calculators";

export const metadata: Metadata = {
  title: "KTU SGPA & CGPA Calculators — Grade Point Average",
  description:
    "Free SGPA, CGPA, attendance, internal marks, and pass mark calculators for KTU students. Built around the KTU grading scale, works offline.",
  alternates: { canonical: "/calculators" },
  openGraph: {
    title: "KTU SGPA & CGPA Calculators — Grade Point Average",
    description:
      "Free SGPA, CGPA, attendance, internal marks, and pass mark calculators for KTU students. Built around the KTU grading scale, works offline.",
    url: "/calculators",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "KTU Calculators",
  applicationCategory: "Calculator",
  operatingSystem: "Web, Android, iOS",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
};

export default function CalculatorsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Calculators />
    </>
  );
}
