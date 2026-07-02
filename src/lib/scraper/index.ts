/**
 * Scraper client — thin wrapper around the existing Express scraper backend.
 * Server-only. Holds the SCRAPER_API_KEY server-side; never expose to client.
 */

export interface ScraperStudentResponse {
  username: string;
  userid: string;
  proimg?: string;
  Gender?: string;
  DateofBirth?: string;
  AadharNumber?: string;
  MotherTongue?: string;
  Category?: string;
  Religion?: string;
  Cast?: string;
  Nationality?: string;
  BloodGroup?: string;
  DateofAdmission?: string;
  AdmissionQuota?: string;
  CollegeAdmissionNumber?: string;
  AdmittedProgram?: string;
  AdmittedBranch?: string;
  AdmittedScheme?: string;
  AdmittedCategory?: string;
  AdmissionType?: string;
  Division?: string;
  EligibleForFeeConcession?: string;
  Programtobecompletedby?: string;
  CurrentSemester?: string;
  StaffAdvisor?: string;
  InstitutionName?: string;
  BankName?: string;
  BranchName?: string;
  AccountNumber?: string;
  AccountHolder?: string;
  IFSCCode?: string;
  Qualification?: string;
  "Board/University"?: string;
  QualifiedYear?: string;
  TotalMarks?: string;
  PercentageofMarks?: string;
  EntranceType?: string;
  PhysicsMarks?: string;
  "Chemistry(otherasspecifiedinCEE)Marks"?: string;
  MathsMarks?: string;
  Rankingtype?: string;
  "EntranceRank/Percentile"?: string;
  EntranceScore?: string;
  Name?: string; // parent name
  Occupation?: string;
  CommunicationAddress?: string;
  PersonalAddress?: string;
  Mobile?: string;
  Email?: string;
  HonoursCreditsRequired?: string;
  HonoursCreditsEarned?: string;
  MinorBranch?: string;
  MinorBasket?: string;
  MinorStaus?: string; // typo from KTU portal — preserved exactly
  // Semester result arrays
  S1?: ScraperCourse[];
  S1sgpa?: string;
  S2?: ScraperCourse[];
  S2sgpa?: string;
  S3?: ScraperCourse[];
  S3sgpa?: string;
  S4?: ScraperCourse[];
  S4sgpa?: string;
  S5?: ScraperCourse[];
  S5sgpa?: string;
  S6?: ScraperCourse[];
  S6sgpa?: string;
  S7?: ScraperCourse[];
  S7sgpa?: string;
  S8?: ScraperCourse[];
  S8sgpa?: string;
  activityPoints?: Record<string, string>;
}

export interface ScraperCourse {
  slot: string;
  course: string; // e.g. "MAT101 - LINEAR ALGEBRA AND CALCULUS"
  credit: string;
  type: string;
  completed: string;
  grade: string; // often "No" (means: not graded externally)
  earned: string; // the actual grade letter, e.g. "A+"
}

export interface ScraperNotification {
  date: string;
  heading: string;
  key: string;
  data: string;
}

export class ScraperError extends Error {
  code: "AUTH_FAILED" | "SCRAPE_FAILED" | "SCRAPER_UNAVAILABLE" | "BAD_RESPONSE";
  status: number;
  constructor(
    code: ScraperError["code"],
    message: string,
    status: number,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "ScraperError";
  }
}

function getScraperConfig() {
  const url = process.env.SCRAPER_API_URL;
  const key = process.env.SCRAPER_API_KEY;
  if (!url || !key) {
    throw new ScraperError("SCRAPER_UNAVAILABLE", "Scraper config missing", 500);
  }
  return { url, key };
}

/**
 * Calls the scraper's POST /api/v1/data endpoint to validate credentials and
 * fetch the student's full academic data.
 *
 * Password is NEVER persisted, NEVER logged, and only used in this single
 * request body.
 */
export async function fetchStudentFromScraper(
  userid: string,
  password: string,
): Promise<ScraperStudentResponse> {
  const { url, key } = getScraperConfig();

  let res: Response;
  try {
    res = await fetch(`${url}/api/v1/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, userid, password }),
      signal: AbortSignal.timeout(60_000), // scraper can be very slow (logs into KTU, scrapes HTML)
    });
  } catch (e) {
    throw new ScraperError(
      "SCRAPER_UNAVAILABLE",
      e instanceof Error ? e.message : "Network error",
      502,
    );
  }

  // Defensive JSON parsing — the scraper or Railway proxy may return
  // SSE-formatted data ("data: {...}") instead of plain JSON when the
  // KTU portal is slow or the response is streamed. Parse the raw text
  // first, strip any SSE "data: " prefixes, then JSON.parse.
  const rawBody = await res.text();

  if (res.status === 403 || res.status === 401) {
    // Scraper returns 403 for BOTH wrong credentials AND scraper failures
    // (KTU site down, HTML changed, CSRF broken, timeout). Surface the real
    // message so the user knows which.
    let scraperMessage = "Invalid credentials";
    let code: ScraperError["code"] = "AUTH_FAILED";
    try {
      const body = safeJsonParse(rawBody) as { status?: string; message?: string } | null;
      if (body?.message) {
        scraperMessage = body.message;
        // If the message indicates a scrape failure (not auth), use SCRAPE_FAILED
        const msg = body.message.toLowerCase();
        if (
          msg.includes("could not fetch") ||
          msg.includes("scrape") ||
          msg.includes("timeout") ||
          msg.includes("ktu") ||
          msg.includes("website") ||
          msg.includes("network")
        ) {
          code = "SCRAPE_FAILED";
        }
      }
    } catch {
      // body wasn't JSON — keep default message
    }
    throw new ScraperError(code, scraperMessage, 401);
  }
  if (!res.ok) {
    // Read the body for a better error message if possible
    let scraperMessage = `Scraper returned ${res.status}`;
    try {
      const body = safeJsonParse(rawBody) as { message?: string } | null;
      if (body?.message) scraperMessage = body.message;
    } catch {
      // ignore
    }
    throw new ScraperError("SCRAPE_FAILED", scraperMessage, 502);
  }

  const data = safeJsonParse(rawBody) as ScraperStudentResponse | null;
  if (!data) {
    throw new ScraperError(
      "BAD_RESPONSE",
      "Scraper returned a non-JSON response (possibly SSE stream). Raw: " + rawBody.slice(0, 100),
      502,
    );
  }
  if (!data.userid || !data.username) {
    throw new ScraperError("BAD_RESPONSE", "Scraper response missing required fields", 502);
  }

  return data;
}

/**
 * Fetch the list of notifications from the scraper backend.
 * No auth required.
 */
export async function fetchNotificationsFromScraper(): Promise<ScraperNotification[]> {
  const { url } = getScraperConfig();
  const res = await fetch(`${url}/api/v1/notifications`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new ScraperError("SCRAPER_UNAVAILABLE", `Status ${res.status}`, 502);
  }
  const rawBody = await res.text();
  const data = safeJsonParse(rawBody) as { notifications: ScraperNotification[] } | null;
  if (!data) {
    throw new ScraperError("SCRAPER_UNAVAILABLE", "Non-JSON response from scraper", 502);
  }
  return data.notifications ?? [];
}

/**
 * Safely parse a response body that might be:
 *   1. Plain JSON: `{"key": "value"}`
 *   2. SSE format: `data: {"key": "value"}\n\n`
 *   3. Multiple SSE lines: `data: {"part1": ...}\ndata: {"part2": ...}\n\n`
 *
 * Strips "data: " prefixes, joins multi-line SSE, then JSON.parses.
 * Returns null if the body cannot be parsed as JSON.
 */
function safeJsonParse(raw: string): unknown | null {
  if (!raw || raw.trim() === "") return null;

  // Check if this is SSE format (starts with "data: ")
  if (raw.trimStart().startsWith("data: ")) {
    // Split into lines, extract data: lines, join
    const lines = raw.split("\n");
    const dataLines = lines
      .filter((line) => line.trimStart().startsWith("data: "))
      .map((line) => line.trimStart().slice(6).trim()); // remove "data: " prefix

    if (dataLines.length === 0) return null;

    // Single line — parse directly
    if (dataLines.length === 1) {
      try {
        return JSON.parse(dataLines[0]!);
      } catch {
        return null;
      }
    }

    // Multiple lines — join and parse (some SSE implementations split JSON across lines)
    try {
      return JSON.parse(dataLines.join(""));
    } catch {
      // Try parsing each line individually and return the first valid one
      for (const line of dataLines) {
        try {
          return JSON.parse(line);
        } catch {
          // continue
        }
      }
      return null;
    }
  }

  // Plain JSON
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
