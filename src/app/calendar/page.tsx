import type { Metadata } from "next";
import { Calendar } from "@/features/calendar/calendar";

export const metadata: Metadata = {
  title: "KTU Academic Calendar — Exam Dates & Timetables",
  description:
    "Stay on top of exams, deadlines, holidays, and academic events. View your exam timetable and academic calendar for APJ Abdul Kalam KTU.",
  alternates: { canonical: "/calendar" },
  openGraph: {
    title: "KTU Academic Calendar — Exam Dates & Timetables",
    description:
      "Stay on top of exams, deadlines, holidays, and academic events. View your exam timetable and academic calendar for APJ Abdul Kalam KTU.",
    url: "/calendar",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "KTU Academic Calendar",
  description: "Exam dates, deadlines, holidays, and academic events for KTU students.",
  isPartOf: { "@type": "WebSite", name: "KTU One", url: "https://ktuone.in" },
};

export default function CalendarPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Calendar />
    </>
  );
}
