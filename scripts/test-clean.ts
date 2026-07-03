import { cleanScraperText, cleanScraperTitle } from "../src/lib/utils/clean-text";

console.log("=== Safety tests ===");
console.log("");

// Test 1: Empty/null/undefined
console.log('null → "' + cleanScraperText(null) + '"');
console.log('undefined → "' + cleanScraperText(undefined) + '"');
console.log('"" → "' + cleanScraperText("") + '"');
console.log('"" → "' + cleanScraperText("   ") + '"');

// Test 2: Malformed HTML
console.log('"<p><div><span>unclosed" → "' + cleanScraperText("<p><div><span>unclosed") + '"');
console.log('"<<<>>>" → "' + cleanScraperText("<<<>>>") + '"');
console.log('"&" → "' + cleanScraperText("&") + '"');
console.log('"&random;" → "' + cleanScraperText("&random;") + '"');

// Test 3: Real scraper data
const realTitle = "Appointment of Zone Convenors for the academic year 2026&ndash;27 &ndash; Conduct of University Intercollegiate Sports Competitions";
const realDesc = "<p>APJ Abdul Kalam Technological University &ndash; Physical Education &ndash; Appointment of Zone Convenors for the academic year 2026&ndash;27 &ndash; Conduct of University Intercollegiate Sports Competitions &ndash; Applications Invited</p>";
console.log("");
console.log("Real title before: " + realTitle);
console.log("Real title after:  " + cleanScraperTitle(realTitle));
console.log("");
console.log("Real desc before: " + realDesc);
console.log("Real desc after:  " + cleanScraperText(realDesc));

// Test 4: No-op on clean text
const cleanText = "This is already clean text with no HTML.";
const cleanedAgain = cleanScraperText(cleanText);
console.log("");
console.log("Clean text: " + cleanText);
console.log("After clean: " + cleanedAgain);
console.log("Is no-op? " + (cleanText === cleanedAgain ? "YES ✅" : "NO ❌"));

// Test 5: Multi-paragraph
const multiPara = "<p>First paragraph</p><p>Second paragraph</p><ul><li>Item 1</li><li>Item 2</li></ul>";
console.log("");
console.log("Multi-paragraph:");
console.log(cleanScraperText(multiPara));
