/**
 * cleanScraperText — converts raw HTML from the KTU scraper into clean
 * plain text for storage in the database.
 *
 * Used ONLY by upsertScraperNotifications() — never by admin notice creation.
 *
 * What it does:
 *   1. Decodes HTML entities (&ndash; → –, &amp; → &, &#8217; → ', etc.)
 *   2. Strips HTML tags (<p>, <br>, <strong>, etc.) → plain text
 *   3. Preserves paragraph/list structure as \n line breaks
 *   4. Collapses excessive whitespace
 *   5. Trims leading/trailing whitespace
 *
 * Safety guarantees:
 *   - NEVER throws — returns the original input on any error
 *   - No-op on already-clean text (if input has no HTML entities or tags,
 *     output equals input)
 *   - Handles empty/null/undefined → returns ""
 *   - Handles malformed HTML gracefully (html-to-text parser is tolerant)
 */

import { decode } from "html-entities";
import { convert } from "html-to-text";

/**
 * Check if a string contains HTML entities or tags that need cleaning.
 * Used to make cleanScraperText a no-op on already-clean text.
 */
function needsCleaning(input: string): boolean {
  // HTML entities: &word; or &#digits; or &#xhex;
  if (/&[a-zA-Z]+;|&#\d+;|&#x[0-9a-fA-F]+;/.test(input)) return true;
  // HTML tags: <word> or </word> or <word/>
  if (/<\/?[a-zA-Z][^>]*>/.test(input)) return true;
  return false;
}

/**
 * Clean raw HTML text from the scraper into plain text.
 *
 * @param raw - The raw string from the scraper (may contain HTML entities + tags)
 * @returns Clean plain text, or the original input if cleaning fails
 */
export function cleanScraperText(raw: string | null | undefined): string {
  // Handle empty/null/undefined
  if (!raw || typeof raw !== "string" || raw.trim() === "") {
    return "";
  }

  // No-op on already-clean text — avoids unnecessary processing
  // and guarantees idempotency (re-running on clean text changes nothing)
  if (!needsCleaning(raw)) {
    return raw.trim();
  }

  try {
    // Step 1: Convert HTML to text (strips tags, preserves structure as \n)
    // Options tuned for notice content:
    //   - wordwrap: 0 = no wrapping (we handle wrapping in CSS)
    //   - preserveNewlines: true (keep existing newlines in text nodes)
    const text = convert(raw, {
      wordwrap: 0,
      preserveNewlines: true,
    });

    // Step 2: Decode any remaining HTML entities that html-to-text didn't catch
    // (e.g., entities inside text nodes that were preserved as-is)
    const decoded = decode(text);

    // Step 3: Collapse 3+ consecutive newlines into 2 (paragraph break)
    const collapsed = decoded.replace(/\n{3,}/g, "\n\n");

    // Step 4: Collapse runs of spaces/tabs into single space (but preserve newlines)
    const trimmed = collapsed
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .join("\n");

    // Step 5: Trim leading/trailing whitespace
    return trimmed.trim();
  } catch {
    // If anything fails (malformed HTML, library error, etc.),
    // fall back to decoding entities only (no tag stripping).
    // This is still better than storing raw HTML.
    try {
      return decode(raw).trim();
    } catch {
      // If even decode fails, return the original input unmodified.
      // Better to store dirty text than to lose data.
      return raw.trim();
    }
  }
}

/**
 * Clean a notice title — same as cleanScraperText but also:
 *   - Collapses to single line (titles shouldn't have line breaks)
 *   - Limits length to 300 chars (matching DB schema)
 */
export function cleanScraperTitle(raw: string | null | undefined): string {
  const cleaned = cleanScraperText(raw);
  // Collapse to single line
  const singleLine = cleaned.replace(/\s*\n\s*/g, " ").trim();
  // Truncate to 300 chars (DB column is String, but title field max is 300)
  if (singleLine.length > 300) {
    return singleLine.slice(0, 297) + "...";
  }
  return singleLine;
}
