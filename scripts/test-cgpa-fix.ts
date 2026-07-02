/**
 * Verify the CGPA calculation — uses the ACTUAL scraper data shape.
 *
 * KTU CGPA = simple average of all semester SGPAs.
 *   CGPA = (Σ SGPA) / (number of semesters with course data)
 *
 * - Semesters with arrears: SGPA = 0, INCLUDED in the average
 * - Semesters not yet reached (no course array): EXCLUDED
 *
 * Run: npx tsx scripts/test-cgpa-fix.ts
 */
import {
  mapScraperToResults,
  mapScraperToCGPA,
} from "../src/lib/scraper/mapper";
import type { ScraperStudentResponse } from "../src/lib/scraper";

function makeCourse(code: string, name: string, credit: string, grade: string): {
  slot: string;
  course: string;
  credit: string;
  type: string;
  completed: string;
  grade: string;
  earned: string;
} {
  return {
    slot: "A",
    course: `${code} - ${name}`,
    credit,
    type: "Valuation by university",
    completed: "Yes",
    grade: "No",
    earned: grade,
  };
}

// Test 1: Student who completed all 8 semesters, some with arrears (SGPA=0)
// S1-S5: SGPA = 7.0 each
// S6: has arrears → SGPA = 0 (missing from scraper)
// S7: SGPA = 8.0
// S8: SGPA = 7.5
// Expected CGPA = (7+7+7+7+7+0+8+7.5) / 8 = 50.5 / 8 = 6.31
const scraper1: ScraperStudentResponse = {
  username: "TEST STUDENT 1",
  userid: "TVE20CS001",
  AdmittedBranch: "COMPUTER SCIENCE & ENGINEERING",
  AdmittedScheme: "B.Tech Full Time 2019 Scheme",
  CurrentSemester: "S8",
  S1: [makeCourse("MAT101", "Math 1", "4", "A")],
  S1sgpa: "7.0",
  S2: [makeCourse("MAT102", "Math 2", "4", "A")],
  S2sgpa: "7.0",
  S3: [makeCourse("CST301", "DS", "4", "A")],
  S3sgpa: "7.0",
  S4: [makeCourse("CST401", "OS", "4", "A")],
  S4sgpa: "7.0",
  S5: [makeCourse("CST501", "FLAT", "4", "A")],
  S5sgpa: "7.0",
  S6: [
    // Has arrears — SGPA missing from scraper
    makeCourse("CST302", "Course", "4", "F"),
    makeCourse("CST303", "Course", "3", "A"),
  ],
  // S6sgpa intentionally MISSING — student has arrears
  S7: [makeCourse("CST401", "AI", "3", "A+")],
  S7sgpa: "8.0",
  S8: [makeCourse("CST402", "DC", "3", "A")],
  S8sgpa: "7.5",
};

// Test 2: Student in S5 (hasn't reached S6-S8)
// S1-S4: SGPA = 8.0 each, S5: current (no results yet, SGPA missing)
// Expected CGPA = (8+8+8+8+0) / 5 = 32 / 5 = 6.40
const scraper2: ScraperStudentResponse = {
  username: "TEST STUDENT 2",
  userid: "TVE22CS001",
  AdmittedBranch: "COMPUTER SCIENCE & ENGINEERING",
  AdmittedScheme: "B.Tech Full Time 2019 Scheme",
  CurrentSemester: "S5",
  S1: [makeCourse("MAT101", "Math 1", "4", "A+")],
  S1sgpa: "8.0",
  S2: [makeCourse("MAT102", "Math 2", "4", "A+")],
  S2sgpa: "8.0",
  S3: [makeCourse("CST301", "DS", "4", "A+")],
  S3sgpa: "8.0",
  S4: [makeCourse("CST401", "OS", "4", "A+")],
  S4sgpa: "8.0",
  S5: [
    // Current semester — results not out
    makeCourse("CST501", "FLAT", "4", "No"),
  ],
  // S5sgpa missing — results not published
};

function test(name: string, scraper: ScraperStudentResponse, expected: number) {
  console.log("=".repeat(60));
  console.log(`TEST: ${name}`);
  console.log("=".repeat(60));

  const semesters = mapScraperToResults(scraper);
  console.log("\nSemesters parsed:");
  for (const s of semesters) {
    console.log(
      `  S${s.semester}: SGPA=${s.sgpa}, credits=${s.totalCredits}, subjects=${s.subjects.length}`,
    );
  }

  const cgpa = mapScraperToCGPA(scraper);
  console.log(`\nCGPA: ${cgpa.cgpa}`);
  console.log(`Total credits: ${cgpa.totalCredits}`);

  const tolerance = 0.05;
  const pass = Math.abs(cgpa.cgpa - expected) < tolerance;
  console.log(`\nExpected: ${expected}`);
  console.log(`Got:      ${cgpa.cgpa}`);
  console.log(pass ? "✅ PASS" : "❌ FAIL");
  console.log("");
  return pass;
}

let allPass = true;
allPass = test("8 semesters, S6 has arrears (SGPA=0)", scraper1, 6.31) && allPass;
allPass = test("S5 student, S5 results pending (SGPA=0)", scraper2, 6.4) && allPass;

console.log("=".repeat(60));
console.log(allPass ? "🎉 ALL TESTS PASSED" : "💥 SOME TESTS FAILED");
console.log("=".repeat(60));
process.exit(allPass ? 0 : 1);
