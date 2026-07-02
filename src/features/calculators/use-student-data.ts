"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import type { SemesterResult, CGPAResult, Grade, CalculatorCourse } from "@/lib/types";

export function useStudentData() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: results } = useQuery({
    queryKey: ["student-results"],
    queryFn: async (): Promise<SemesterResult[] | null> => {
      const res = await fetch("/api/v1/results", { credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json();
      return data.results as SemesterResult[];
    },
    enabled: isAuthenticated,
    staleTime: 60 * 60 * 1000,
  });

  const { data: cgpa } = useQuery({
    queryKey: ["student-cgpa"],
    queryFn: async (): Promise<CGPAResult | null> => {
      const res = await fetch("/api/v1/cgpa", { credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json();
      return data.cgpa as CGPAResult;
    },
    enabled: isAuthenticated,
    staleTime: 60 * 60 * 1000,
  });

  return { results, cgpa, isAuthenticated };
}

export function semesterResultToCourses(sem: SemesterResult): CalculatorCourse[] {
  return sem.subjects.map((s, i) => ({
    id: `real_${sem.semester}_${i}`,
    subjectCode: s.subjectCode,
    subjectName: s.subjectName,
    credits: s.credits,
    grade: s.grade as Grade,
  }));
}

export function cgpaToSemesters(cgpa: CGPAResult): { sgpa: number; credits: number }[] {
  // Only include semesters where KTU has published an SGPA. Semesters with
  // supplies (no SGPA) are excluded — the CGPA calculator mirrors the
  // official KTU calculation which only averages published SGPAs.
  return cgpa.semesters
    .filter((s) => s.sgpa !== undefined && s.sgpa !== null)
    .map((s) => ({ sgpa: s.sgpa as number, credits: s.totalCredits }));
}
