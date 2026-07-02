/**
 * Verify the CGPA calculation — credit-weighted formula.
 *
 * KTU CGPA = Σ(Semester Credits × Semester SGPA) / Σ(Semester Credits)
 *
 * - Semesters with arrears: SGPA = 0, INCLUDED (0×credits in numerator,
 *   credits in denominator)
 * - Semesters not yet reached: EXCLUDED entirely
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

// Test: Student with S6 arrears (SGPA missing → 0)
// S1-S5: SGPA = 8.0, credits = 24 each → weighted = 8.0×24 = 192 each
// S6: arrears → SGPA = 0, credits = 20 → weighted = 0×20 = 0
// S7: SGPA = 7.0, credits = 22 → weighted = 154
// S8: SGPA = 9.0, credits = 20 → weighted = 180
// Expected: (192×5 + 0 + 154 + 180) / (24×5 + 20 + 22 + 20) = 1294 / 162 = 7.99
const scraper: ScraperStudentResponse = {
  username: "TEST STUDENT",
  userid: "TVE20CS001",
  AdmittedBranch: "COMPUTER SCIENCE & ENGINEERING",
  AdmittedScheme: "B.Tech Full Time 2019 Scheme",
  CurrentSemester: "S8",
  S1: [makeCourse("MAT101", "Math 1", "4", "A"), makeCourse("PHT100", "Physics", "3", "A"), makeCourse("CST101", "Programming", "4", "A"), makeCourse("EST100", "Graphics", "3", "A"), makeCourse("HUN101", "English", "4", "A"), makeCourse("HUN102", "Math", "6", "A")],
  S1sgpa: "8.0",
  S2: [makeCourse("MAT102", "Math 2", "4", "A"), makeCourse("CST203", "DS", "4", "A"), makeCourse("ECT201", "Electronics", "3", "A"), makeCourse("EST110", "Civil", "3", "A"), makeCourse("HUN201", "Economics", "6", "A"), makeCourse("HUN202", "Math 3", "4", "A")],
  S2sgpa: "8.0",
  S3: [makeCourse("CST301", "Discrete", "4", "A"), makeCourse("CST303", "Java", "4", "A"), makeCourse("CST305", "DS2", "3", "A"), makeCourse("CST307", "DBMS", "3", "A"), makeCourse("CST309", "COA", "3", "A"), makeCourse("CST311", "TOC", "3", "A"), makeCourse("CSL331", "Lab", "2", "A"), makeCourse("CSL333", "Lab2", "2", "A")],
  S3sgpa: "8.0",
  S4: [makeCourse("CST401", "OS", "4", "A"), makeCourse("CST403", "Networks", "4", "A"), makeCourse("CST405", "MP", "3", "A"), makeCourse("CST407", "SE", "3", "A"), makeCourse("CST409", "DBMS2", "3", "A"), makeCourse("CST411", "OS Lab", "2", "A"), makeCourse("CST413", "DB Lab", "2", "A"), makeCourse("HUN301", "Management", "3", "A")],
  S4sgpa: "8.0",
  S5: [makeCourse("CST501", "FLAT", "4", "A"), makeCourse("CST503", "Graphics", "3", "A"), makeCourse("CST505", "ML", "3", "A"), makeCourse("CST507", "System SW", "3", "A"), makeCourse("CST509", "Compiler", "3", "A"), makeCourse("CST511", "Economics", "3", "A"), makeCourse("CSL361", "Lab", "2", "A"), makeCourse("CSD331", "Mini", "3", "A")],
  S5sgpa: "8.0",
  S6: [
    // Has arrears — SGPA missing
    makeCourse("CST302", "Course", "4", "F"),
    makeCourse("CST304", "Course", "3", "A"),
    makeCourse("CST306", "Course", "3", "A"),
    makeCourse("CST308", "Course", "3", "A"),
    makeCourse("CST310", "Course", "3", "A"),
    makeCourse("CSL332", "Lab", "2", "A"),
    makeCourse("CSD334", "Mini2", "2", "A"),
  ],
  // S6sgpa intentionally MISSING
  S7: [makeCourse("CST401", "AI", "3", "A"), makeCourse("CST463", "Web", "3", "A"), makeCourse("CET445", "Disasters", "3", "A"), makeCourse("CSL411", "Compiler Lab", "2", "A"), makeCourse("CSQ413", "Seminar", "2", "A"), makeCourse("CSD415", "Project1", "2", "A"), makeCourse("MCN401", "Safety", "0", "A")],
  S7sgpa: "7.0",
  S8: [makeCourse("CST402", "DC", "3", "A"), makeCourse("CST464", "Embedded", "3", "A"), makeCourse("CST466", "DM", "3", "A"), makeCourse("CST468", "Bio", "3", "A"), makeCourse("CST404", "Viva", "1", "A"), makeCourse("CSD416", "Project2", "4", "A"), makeCourse("CST470", "Elective", "3", "A")],
  S8sgpa: "9.0",
};

console.log("=".repeat(60));
console.log("CGPA CREDIT-WEIGHTED FORMULA VERIFICATION");
console.log("=".repeat(60));
console.log("Formula: Σ(credits × sgpa) / Σ(credits)");
console.log("");

const semesters = mapScraperToResults(scraper);
console.log("Semesters parsed:");
let totalCredits = 0;
let weighted = 0;
for (const s of semesters) {
  const contrib = s.sgpa * s.totalCredits;
  totalCredits += s.totalCredits;
  weighted += contrib;
  console.log(`  S${s.semester}: SGPA=${s.sgpa}, credits=${s.totalCredits}, contribution=${contrib.toFixed(2)}`);
}
console.log(`\nTotals: weighted=${weighted.toFixed(2)}, credits=${totalCredits}`);
console.log(`Expected CGPA: ${(weighted / totalCredits).toFixed(4)}`);

const cgpa = mapScraperToCGPA(scraper);
console.log(`Got CGPA:      ${cgpa.cgpa}`);

const expected = weighted / totalCredits;
const pass = Math.abs(cgpa.cgpa - Number(expected.toFixed(2))) < 0.05;
console.log(pass ? "\n✅ PASS — credit-weighted formula correct" : "\n❌ FAIL");
process.exit(pass ? 0 : 1);
