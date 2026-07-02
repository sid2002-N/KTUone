/**
 * Verify the CGPA fix — simulates a student with supplies in some semesters.
 *
 * Before the fix: semesters with no SGPA defaulted to 0, dragging down CGPA.
 * After the fix: semesters with no SGPA are excluded from the CGPA calculation.
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
    slot: "SLOT1",
    course: `${code} - ${name}`,
    credit,
    type: "CORE",
    completed: "completed",
    grade: "Yes",
    earned: grade,
  };
}

// Simulate a student:
//   S1: cleared, SGPA = 8.5 (24 credits)
//   S2: cleared, SGPA = 7.8 (24 credits)
//   S3: has supply → NO SGPA published (24 credits, all courses present)
//   S4: cleared, SGPA = 8.0 (24 credits)
//   S5: current semester, results not out → NO SGPA (24 credits present)
//   S6-S8: not yet reached → no courses
//
// Expected CGPA (KTU official): (8.5*24 + 7.8*24 + 8.0*24) / 72 = 583.2 / 72 = 8.10
// Buggy CGPA (old):             (8.5*24 + 7.8*24 + 0*24 + 8.0*24 + 0*24) / 120 = 583.2 / 120 = 4.86
const scraper: ScraperStudentResponse = {
  username: "TEST STUDENT",
  userid: "TVE21CS001",
  AdmittedBranch: "Computer Science & Engineering",
  AdmittedScheme: "2019 Scheme",
  CurrentSemester: "S5",
  DateofAdmission: "08/2021",
  Email: "test@example.com",
  Mobile: "+91 9999999999",
  S1: [
    makeCourse("MAT101", "Linear Algebra", "4", "A+"),
    makeCourse("PHT100", "Physics", "3", "A"),
    makeCourse("CST101", "Programming", "4", "O"),
    makeCourse("EST100", "Engineering Graphics", "3", "B+"),
  ],
  S1sgpa: "8.5",
  S2: [
    makeCourse("MAT102", "Calculus", "4", "A"),
    makeCourse("CST203", "Data Structures", "4", "A+"),
    makeCourse("ECT201", "Electronics", "3", "B+"),
  ],
  S2sgpa: "7.8",
  S3: [
    // Has a supply — F grade in one subject
    makeCourse("CST301", "Discrete Math", "4", "A"),
    makeCourse("CST303", "OOP Java", "4", "F"), // ← supply
    makeCourse("CST305", "Data Structures 2", "3", "A"),
    makeCourse("CSL331", "DS Lab", "2", "A+"),
  ],
  // S3sgpa is MISSING — KTU doesn't publish SGPA when there's a supply
  S4: [
    makeCourse("CST401", "Operating Systems", "4", "A"),
    makeCourse("CST403", "Computer Networks", "4", "A+"),
    makeCourse("CST405", "Microprocessors", "3", "A"),
  ],
  S4sgpa: "8.0",
  S5: [
    // Current semester — results not out yet
    makeCourse("CST501", "Formal Languages", "4", "No"),
    makeCourse("CST503", "Computer Graphics", "3", "No"),
    makeCourse("CST505", "Machine Learning", "3", "No"),
  ],
  // S5sgpa is MISSING — results not published yet
};

console.log("=".repeat(60));
console.log("CGPA FIX VERIFICATION");
console.log("=".repeat(60));

const semesters = mapScraperToResults(scraper);
console.log("\nSemesters parsed:");
for (const s of semesters) {
  const sgpaDisplay = s.sgpa !== undefined ? s.sgpa.toFixed(2) : "N/A (supply/not published)";
  console.log(
    `  S${s.semester}: SGPA=${sgpaDisplay}, credits=${s.totalCredits}, earned=${s.creditsEarned}, subjects=${s.subjects.length}`,
  );
}

const cgpa = mapScraperToCGPA(scraper);
console.log("\nCGPA result:");
console.log(`  CGPA:          ${cgpa.cgpa}`);
console.log(`  Total credits: ${cgpa.totalCredits} (only from semesters with SGPA)`);
console.log(`  Credits earned: ${cgpa.creditsEarned}`);

const expected = 8.1;
const tolerance = 0.05;
const pass = Math.abs(cgpa.cgpa - expected) < tolerance;
console.log("\n" + "─".repeat(60));
console.log(`Expected CGPA: ~${expected} (average of 8.5, 7.8, 8.0)`);
console.log(`Got CGPA:      ${cgpa.cgpa}`);
console.log(
  pass ? "✅ PASS — fix works correctly" : "❌ FAIL — CGPA is still wrong",
);

if (!pass) {
  console.log("\nDebug:");
  console.log("  Semesters with SGPA included in CGPA:");
  for (const s of cgpa.semesters) {
    if (s.sgpa !== undefined) {
      console.log(`    S${s.semester}: ${s.sgpa} × ${s.totalCredits} = ${s.sgpa * s.totalCredits}`);
    }
  }
  process.exit(1);
}
