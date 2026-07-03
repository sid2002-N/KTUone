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
  "@type": "WebApplication",
  name: "KTU Calculators",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web, Android, iOS",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  description:
    "SGPA, CGPA, attendance, internal marks, and pass mark calculators for KTU students.",
  url: "https://ktuone.in/calculators",
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
