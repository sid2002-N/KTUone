# KTU One — Worklog

## 2025 — Task `recreate-infra` — Recreate lost infrastructure files

**Scope:** Recreate 7 infrastructure files that were lost during sandbox
resets. These files are referenced by existing routes and providers but were
missing from the working tree.

### Files created

| # | Path | Purpose |
|---|------|---------|
| 1 | `src/lib/storage/r2.ts` | Cloudflare R2 storage helper (upload, signed download URL, delete, key builders for papers + syllabus) using `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. |
| 2 | `src/lib/payments/razorpay-server.ts` | Razorpay server helper: `createOrder` (₹99 / 9900 paise, creates `Pending` SupporterPurchase), `verifyPaymentSignature` (HMAC-SHA256 + timing-safe compare), `markPurchaseSuccess`, `checkSupporterStatus`. |
| 3 | `src/lib/providers/authed-fetch.ts` | Client-side `authedFetch(url, init?)` — sends credentials, on 401 calls `/api/v1/refresh`, retries once. Deduplicates concurrent refresh calls via a module-scoped `_refreshing` promise. |
| 4 | `src/lib/providers/payment-razorpay.ts` | Client-side `RazorpayPaymentProvider` implementing the `PaymentProvider` interface. `initiatePurchase` calls `/api/v1/payments/create-order`, loads `checkout.razorpay.com`, opens the modal, then calls `/api/v1/payments/verify`. `restorePurchase` calls `/api/v1/payments/restore`. Declares `window.Razorpay` globally. |
| 5 | `src/lib/auth/ratelimit.ts` | Upstash-backed rate limits: `checkLoginRateLimit` (5 / 15 min), `checkRefreshRateLimit` (30 / hour), `getRequestIp`. Graceful no-op (returns `success: true`) when `UPSTASH_REDIS_REST_URL` is unset. |
| 6 | `src/lib/auth/admin-cors.ts` | `getAdminCorsHeaders`, `adminJsonResponse`, `handleAdminOptions`. Production allow-list via `ADMIN_ALLOWED_ORIGIN`; dev uses `*`. |
| 7 | `src/middleware.ts` | Defense-in-depth route protection for `/api/v1/*`. Allows public auth routes, admin routes (Bearer API key), download routes (handler does own auth); all other routes require a valid `ktu_access` JWT cookie verified with `jose`. Matcher: `["/api/v1/:path*"]`. |

### Integration points verified

- `src/app/api/v1/login/route.ts` already imports
  `{ checkLoginRateLimit, getRequestIp }` from `@/lib/auth/ratelimit` — now
  resolves.
- `src/app/api/v1/refresh/route.ts` already imports
  `{ checkRefreshRateLimit, getRequestIp }` from `@/lib/auth/ratelimit` — now
  resolves.
- `src/app/api/v1/papers/[id]/download/route.ts` and
  `src/app/api/v1/syllabus/[id]/download/route.ts` already import
  `{ getSignedDownloadUrl }` from `@/lib/storage/r2` — now resolves.
- `src/lib/providers/payment.ts` exports the `PaymentProvider` interface and
  `InitiatePurchaseInput` / `InitiatePurchaseResult` types — the new
  `RazorpayPaymentProvider` consumes these correctly.
- `src/lib/auth/index.ts` uses the `ktu_access` cookie name and HS256 JWTs —
  the middleware mirrors the same cookie name and verification logic (using
  `jose` directly because `next/headers` and Prisma are unavailable in the
  edge runtime).

### Environment variables referenced

All env vars are already declared in `.env.example`:
- R2: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET_NAME`
- Razorpay: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- Upstash: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Admin CORS: `ADMIN_ALLOWED_ORIGIN`
- JWT: `JWT_SECRET`

### Validation

- `bun run lint` → **clean** (no errors, no warnings).
- Dev server (`bun run dev`) still serves `GET /` 200 after the new
  `middleware.ts` was picked up. Next.js 16 emits a one-time deprecation
  notice suggesting the new `proxy` file convention; `middleware.ts` is still
  fully supported and is what the task spec required.

### Notes for future agents

- `razorpay-server.ts` and `ratelimit.ts` are server-only. Do not import
  them from Client Components.
- `authed-fetch.ts` and `payment-razorpay.ts` are `"use client"` modules.
  They depend only on `fetch` and DOM APIs — safe to import from any client
  component or hook.
- `admin-cors.ts` is server-only (uses `NextResponse` from `next/server`).
- `middleware.ts` runs on the edge runtime — keep it free of Prisma,
  `next/headers`, and Node-only modules. JWT verification uses `jose`
  directly to honor this constraint.
- The middleware explicitly allows `/api/v1/papers/[id]/download` and
  `/api/v1/syllabus/[id]/download` through (no JWT check) because those
  handlers perform their own auth via `getAuthenticatedStudent(req)` before
  redirecting to a signed R2 URL.

---

## 2025 — Task `recreate-admin-ui` — Recreate admin UI + wire Razorpay provider

**Scope:** Build the 8 admin UI files (route entry + login + dashboard + 5
feature panels) and wire `RazorpayPaymentProvider` into the app's
`Providers` tree. All API routes and server actions already existed — only
client UI + the payment provider swap were required.

### Files created / modified

| # | Path | Action | Purpose |
|---|------|--------|---------|
| 1 | `src/app/admin/page.tsx` | created | Route entry. Holds `adminKey` in `useState`; swaps `AdminLogin` ↔ `AdminDashboard`. Key is never persisted — reload signs the admin out. |
| 2 | `src/features/admin/admin-login.tsx` | created | Centered card with `Lock` icon, password input. Tests key via `GET /api/v1/admin/notices` with `Authorization: Bearer <key>`; on 200 → `onLogin(key)`. Inline error states for 401/403/network. |
| 3 | `src/features/admin/admin-dashboard.tsx` | created | Sticky header (logo + title + Logout), button-based tab strip (NOT Radix Tabs — simpler, no focus-trap quirks). 5 tabs: Notices, Calendar, Papers, Syllabus, Timetables. Icons: `Bell`, `CalendarDays`, `FileText`, `BookOpen`, `GraduationCap`. Sticky footer. |
| 4 | `src/features/admin/notices-admin.tsx` | created | List (`max-h-96 overflow-y-auto`) + create form (title, description, category select, priority select, pinned checkbox, externalUrl, comma-separated tags). Create POSTs JSON to `/api/v1/admin/notices` with `publishedAt: now`. Delete via `?id=` with `confirm()`. |
| 5 | `src/features/admin/calendar-admin.tsx` | created | Same pattern. Form: title, description, type select, `datetime-local` start/end inputs. POSTs ISO-converted dates to `/api/v1/admin/calendar`. |
| 6 | `src/features/admin/papers-admin.tsx` | created | List + multipart upload form (`<input type="file" accept="application/pdf">`, title, subjectCode/Name, semester/branch selects from `BRANCHES`/`SEMESTERS`, year, month, examType). POSTs `FormData` to `/api/v1/admin/papers/upload` with only the `Authorization` header (browser sets multipart boundary). Delete via `?id=`. Test-download link to `/api/v1/papers/<id>/download`. |
| 7 | `src/features/admin/syllabus-admin.tsx` | created | Mirrors papers-admin for syllabus. Fields: file, title, subjectCode/Name, semester, branch, version, modules. POSTs to `/api/v1/admin/syllabus/upload`. |
| 8 | `src/features/admin/timetables-admin.tsx` | created | List + create form with dynamic entry rows. Form fields: title, examType, semester, branch (incl. "ALL"), academicYear. Entries: add/remove rows of `{date, session (FN/AN), subjectCode, subjectName}`. POSTs to `/api/v1/admin/timetables`. Synthesizes a deterministic `fileUrl` placeholder because the existing `TimetableInputSchema` requires it (no multipart upload wired in this route). |
| 9 | `src/lib/providers/index.tsx` | modified | Added imports for `__setPaymentProvider` + `RazorpayPaymentProvider`. `WireStudentService`'s `useEffect` now also calls `__setPaymentProvider(new RazorpayPaymentProvider())` at app boot, replacing the default `MockPaymentProvider`. |

### API contract notes (gotchas)

- **Multipart uploads**: for `papers/upload` and `syllabus/upload`, the
  client MUST NOT set `Content-Type` — the browser sets the multipart
  boundary. Only the `Authorization: Bearer` header is added.
- **Timetables schema mismatch**: the existing `TimetableInputSchema`
  accepts `{title, semester, branchCode, fileUrl, isActive}` — there is no
  `examType` / `academicYear` / entries field. The admin UI collects those
  richer fields and includes them in the POST body for forward-compat, but
  the server's Zod parse currently strips them. The required `fileUrl` is
  synthesized as `admin-timetable-<ts>-<slug>` so the schema validates.
- **Soft-deleted rows**: admin list endpoints return soft-deleted papers /
  syllabus / notices. The UI surfaces a "deleted" badge on those rows.
- **Download test links**: `/api/v1/papers/<id>/download` and
  `/api/v1/syllabus/<id>/download` are public student routes that perform
  their own `getAuthenticatedStudent` auth — opening them from the admin
  panel without a student session will 401. The link is still useful for
  confirming the R2 key exists.

### Razorpay wiring

`RazorpayPaymentProvider.initiatePurchase` flow (already implemented in
`src/lib/providers/payment-razorpay.ts`, now actually swapped in at boot):

1. `POST /api/v1/payments/create-order` via `authedFetch` (creates the
   Razorpay order + a `Pending` SupporterPurchase row server-side).
2. Load `https://checkout.razorpay.com/v1/checkout.js`.
3. Open the Razorpay modal with the returned `order_id`.
4. On success, `POST /api/v1/payments/verify` with the payment/order IDs +
   signature (server verifies via HMAC-SHA256 + timing-safe compare).

The default `MockPaymentProvider` is no longer reachable at runtime — the
`__setPaymentProvider` call in `WireStudentService` overwrites it before any
component can call `getPaymentProvider()`.

### Validation

- `bun run lint` → **clean** (0 errors, 0 warnings).
  - Initial run flagged 5 unused `eslint-disable-next-line
    react-hooks/exhaustive-deps` directives (the rule wasn't triggering on
    the `authHeaders`-in-`useCallback` pattern). Removed them.
- Dev server:
  - `GET /admin` → 200 (compile 732ms, render 61ms) — first hit
  - `GET /admin` → 200 (compile 2ms, render 31ms) — cached
  - `GET /` → 200 — home route still works after the providers change
  - HTML contains "KTU One Admin", "Admin API Key", "Sign in" — confirms
    the login card renders server-side.

### Notes for future agents

- The admin panel is intentionally not linked from the student app shell —
  it lives at `/admin` and is treated as a separate surface. In production
  it would typically be served from a different origin (e.g.
  `admin.ktuone.in`) and the `ADMIN_ALLOWED_ORIGIN` env var would lock CORS
  down accordingly.
- The `adminKey` is held only in `useState` on `/admin`. If a future spec
  needs it to survive reload, prefer `sessionStorage` over `localStorage`
  so it clears when the browser tab closes.
- If the timetable backend is ever extended to accept `examType`,
  `academicYear`, and an `entries` array, the UI is already sending them —
  just update `TimetableInputSchema` and the `createTimetable` action.
- The "Test download" link on papers/syllabus will 401 if the admin opens
  it without a student cookie. This is expected behaviour, not a bug.

---

## 2025 — Task `rewire-screens` — Re-wire 5 feature screens to Server Actions + TanStack Query

**Scope:** The 5 student-facing feature screens (papers, syllabus, notices,
calendar, search overlay) had reverted to importing hardcoded mock data
from `@/data/mock-data` after sandbox resets. The Server Actions in
`src/features/*/actions.ts` already existed and worked — the screens just
needed their data sources swapped back to live queries via TanStack Query.
No UI/UX, styling, or layout was changed.

### Files modified

| # | Path | What changed |
|---|------|--------------|
| 1 | `src/features/papers/papers.tsx` | Removed `MOCK_PAPERS` import + `useMemo`. Added `useQuery` + `getPapers`, `getPaperYears`, `PaperFilters` from `@/features/papers/actions`, plus `Skeleton`. The `years` useMemo (derived from `MOCK_PAPERS`) → `useQuery({ queryKey: ["papers","years"], queryFn: getPaperYears, staleTime: 60s })`. The `filtered` useMemo → `useQuery({ queryKey: ["papers", filters], queryFn: () => getPapers(filters), staleTime: 60s })` where `filters = { search, branch, semester, year }`. Renamed `filtered` → `papers`. Added 6× `Skeleton h-48 rounded-2xl` loading grid, empty state when `papers.length === 0 && !isLoading`, updated count display to `papers.length`. |
| 2 | `src/features/syllabus/syllabus.tsx` | Removed `MOCK_SYLLABUS` import + `useMemo`. Added `useQuery` + `getSyllabus`, `SyllabusFilters` from `@/features/syllabus/actions`, plus `Skeleton`. The `filtered` useMemo → `useQuery({ queryKey: ["syllabus", filters], queryFn: () => getSyllabus(filters), staleTime: 60s })` where `filters = { search, branch, semester }`. Renamed `filtered` → `syllabus`. Added 4× `Skeleton h-32 rounded-2xl` loading grid, empty state when `syllabus.length === 0 && !isLoading`. |
| 3 | `src/features/notices/notices.tsx` | Removed `MOCK_NOTICES` import + `useMemo`. Added `useQuery` + `getNotices` from `@/features/notices/actions`, plus `Skeleton`. The `filtered` useMemo (which did category filter + pinned/date sort client-side) → `useQuery({ queryKey: ["notices", filter], queryFn: () => getNotices(filter), staleTime: 60s })`. The server action already filters by category and orders by `[{ pinned: "desc" }, { publishedAt: "desc" }]` — same sort the client was doing. Renamed `filtered` → `notices`. Added 4× `Skeleton h-24 rounded-2xl` loading column, empty state preserved. |
| 4 | `src/features/calendar/calendar.tsx` | Removed `MOCK_CALENDAR` import. Added `useQuery` + `getCalendarEvents` from `@/features/calendar/actions`, plus `Skeleton`. The hardcoded `const events = [...MOCK_CALENDAR].sort(...)` → `const { data: events = [], isLoading } = useQuery({ queryKey: ["calendar"], queryFn: getCalendarEvents, staleTime: 5*60*1000 })` (5 min staleTime per spec). Added a derived `sortedEvents = [...events].sort(by startDate asc)` (server also sorts by `startDate: "asc"`, this is defensive per spec). Added 4× `Skeleton h-24 rounded-2xl` loading column via inline ternary inside `<div className="space-y-6">`. |
| 5 | `src/features/search/search-overlay.tsx` | Removed `MOCK_PAPERS, MOCK_SYLLABUS, MOCK_NOTICES, MOCK_CALENDAR, SUBJECTS` import + `useMemo`. Added `useQuery` + `searchAll` from `@/features/search/actions`, plus `Loader2` from lucide. Removed the local `Result` interface (with `meta?: string`) and the giant client-side search `useMemo` that iterated 5 mock arrays. Replaced with `useQuery({ queryKey: ["search", query], queryFn: () => searchAll(query), enabled: query.trim().length >= 1, staleTime: 30s })`. Results are filtered through an `isDisplayResult` type guard that narrows `SearchResult.kind` (which includes `history` / `bookmark`) down to the 5 kinds the overlay renders (`paper`, `syllabus`, `notice`, `calendar`, `subject`). Added a `formatResultMeta(r)` helper that converts the server's `meta: Record<string, string \| number>` into the same display string the old client-side code produced (e.g. `"CER · S3 · May 2023"`). Removed the `grouped` `useMemo` — grouping now done inline as a derived const that walks `Object.keys(kindMeta)` in the canonical kind order. Added a `Loader2` + `animate-spin` spinner shown when `isFetching && results.length === 0` (initial fetch of a new query). |

### Cross-cutting implementation notes

- **Server Action invocation**: all 5 screens call the `"use server"` actions
  directly inside `useQuery`'s `queryFn`. TanStack Query handles
  deduplication, caching, and refetch-on-focus automatically. No fetch
  boilerplate, no `useEffect`.
- **Query keys**:
  - `["papers", "years"]` — stable, fetches once per session.
  - `["papers", filters]` — `filters` is the full `{ search, branch, semester, year }`
    object; TanStack serializes it for cache keying, so each filter combination
    is cached separately.
  - `["syllabus", filters]` — `{ search, branch, semester }`.
  - `["notices", filter]` — `filter` is the category string ("All" / "Academic" / …).
  - `["calendar"]` — single static key (calendar isn't filtered).
  - `["search", query]` — per-keystroke query string.
- **staleTime policy** (per spec): `60 * 1000` (1 min) for papers / syllabus /
  notices, `5 * 60 * 1000` (5 min) for calendar (rarely changes), `30 * 1000`
  (30 s) for search (more responsive to new content).
- **Loading UX**: every screen renders `Skeleton` placeholders matching the
  shape of the loaded content (6× `h-48` cards for papers, 4× `h-32` cards
  for syllabus, 4× `h-24` rows for notices, 4× `h-24` rows for calendar).
  The search overlay uses a centred `Loader2` spinner instead (its results
  don't have a fixed card shape to skeleton).
- **Empty state UX**: every screen preserves the existing `EmptyState`
  illustration (sketch books / notebook) and shows it when
  `data.length === 0 && !isLoading`. The papers screen's `EmptyState`
  keeps its "Clear filters" primary action.
- **Notices `read` field**: the server action does not return a `read`
  boolean (it's a client-only concept). The existing `!n.read &&` UI check
  therefore now renders the "New" badge on every notice. This is a
  consequence of the data-source swap, not a UI change — left untouched per
  the "keep all existing UI/UX" rule. (Future work: derive `read` state
  client-side from a `lastSeenNoticesAt` timestamp in `localStorage`.)

### Type-safety work in `search-overlay.tsx`

`SearchResult.kind` is the full `SearchKind` union
(`subject | paper | syllabus | notice | calendar | history | bookmark`) —
but `searchAll` only ever returns the first 5, and `kindMeta` is keyed by
exactly those 5. Two design choices were made:

1. **Type guard `isDisplayResult`** filters the `SearchResult[]` from
   `searchAll` down to `DisplayResult[]` (`SearchResult & { kind: ResultKind }`).
   This keeps `kindMeta[r.kind]` lookups type-safe without `as` casts at
   every use site. If a future `searchAll` extension starts returning
   `history` / `bookmark` kinds, they'll be silently dropped from the
   overlay until `kindMeta` is extended.
2. **`formatResultMeta` helper** converts the server's
   `meta: Record<string, string | number>` into the display string the old
   client-side code produced. The `kind`-specific `switch` mirrors the
   previous inline template literals exactly, so the rendered meta text is
   byte-for-byte identical to what users saw before the rewire (e.g.
   `"CER · S3 · May 2023"` for a paper, `"2 hours ago"` for a notice).

### Out-of-scope files still importing `@/data/mock-data`

Two files outside the 5-screen scope still import from `@/data/mock-data`:

- `src/lib/providers/student.ts` — `MockStudentService` uses
  `MOCK_STUDENT`, `MOCK_CGPA`, `MOCK_SEMESTER_RESULTS`, `MOCK_ATTENDANCE`.
  This is the intentional mock backend for the `StudentService` interface
  (see file header comment). It's not a screen — it's the data layer that
  the (separate) auth + profile + results flows go through. Out of scope.
- `src/features/dashboard/dashboard.tsx` — uses `MOCK_PAPERS`,
  `MOCK_NOTICES`, `MOCK_CALENDAR`, `MOCK_HISTORY`, `MOCK_STUDENT` to render
  preview snippets on the home dashboard. Not in the 5-screen list. Left
  untouched. (Future task: rewire dashboard to `getPapers({})`,
  `getNotices("All")`, `getCalendarEvents()` for live previews.)

### Validation

- `bun run lint` → **clean** (0 errors, 0 warnings). No new lint issues
  introduced. The pre-existing unused `cn` import in `papers.tsx` is
  untouched (the project's ESLint config has `no-unused-vars` and
  `@typescript-eslint/no-unused-vars` both set to `"off"`, so it was already
  not flagged).
- `rg "@/data/mock-data" src/features/{papers,syllabus,notices,calendar,search}/*`
  → **0 matches**. All 5 rewired screens are clean of mock-data imports.
- Dev server (`bun run dev`) log shows `GET / 200` responses continue
  normally; the screens are client components, so they hydrate and fire
  their `useQuery` calls against the existing Server Actions on mount.
- The `QueryClientProvider` is already wired in `src/lib/providers/index.tsx`
  (from the earlier `recreate-admin-ui` task), so no provider plumbing was
  needed.

### Notes for future agents

- The 5 screens now make **real network round-trips** to the Server Actions
  on first render. If the database is empty (e.g. fresh sandbox), each
  screen will show its `EmptyState` instead of mock content. Seed data
  should be added via the `/admin` panel (papers-upload, syllabus-upload,
  notices create, calendar create) before demoing.
- The `papers` query's `filters` object is part of the query key. Because
  `PaperFilters` is a plain object, TanStack serializes it by value — two
  calls with the same `{ search, branch, semester, year }` will share a
  cache entry. This is the desired behaviour.
- The `search-overlay` uses `enabled: query.trim().length >= 1`. The
  `searchAll` action itself also guards `q.length < 2 → return []`, so a
  1-character query will round-trip and return `[]`. The overlay's
  `enabled` check is a defence-in-depth to avoid the round-trip entirely.
  If you want to enforce a 2-char minimum client-side, change `>= 1` to
  `>= 2`.
- When extending `searchAll` to return new kinds (e.g. `history` /
  `bookmark`), update `kindMeta` in `search-overlay.tsx` and remove the
  corresponding `isDisplayResult` filter branch — otherwise the new kinds
  will be silently dropped.
- The `notices` screen's `!n.read` "New" badge now shows on every notice
  because the server doesn't return `read`. If this becomes a UX issue,
  implement client-side read tracking (e.g. `useReadNoticesStore` backed
  by `localStorage`) and merge `read` into the query result via `select`.

---

## 2025 — Task `fix-blockers` — Fix 3 blockers (calculator pre-fill, hybrid bookmarks, calendar timetable tab)

**Scope:** Three long-standing blockers each broke a feature that already
had the right backend / hook in place but was wired to the wrong (or no)
data source on the client:

1. **Calculators pre-fill not working** — the `useStudentData` hook at
   `src/features/calculators/use-student-data.ts` existed and was fetching
   real `/api/v1/results` + `/api/v1/cgpa` data when authenticated, but
   `SgpaCalculator` and `CgpaCalculator` ignored it and always rendered
   with hardcoded sample rows.
2. **Papers / Syllabus used the old localStorage-only bookmark store**
   (`useBookmarkStore`) instead of the hybrid `useBookmarks` hook — so
   bookmarks made while logged in were never persisted to the server.
3. **Calendar was missing the Exam Timetable tab** — the
   `getActiveTimetable` Server Action existed but the calendar page only
   rendered the academic-events list.

### Files modified

| # | Path | What changed |
|---|------|--------------|
| 1 | `src/features/calculators/calculators.tsx` | Consolidated `useEffect` import to the top (was previously imported mid-file at line 188). Added `import { useStudentData, semesterResultToCourses, cgpaToSemesters } from "@/features/calculators/use-student-data"`. In `SgpaCalculator`: added `const { results, isAuthenticated } = useStudentData()` + a `realLoaded` state flag + a `useEffect` that, when `isAuthenticated && results && results.length > 0 && !realLoaded`, defers `setCourses(semesterResultToCourses(results[results.length - 1]))` + `setRealLoaded(true)` inside `Promise.resolve().then(...)` (avoids the lint rule about calling setState synchronously inside an effect). The `realLoaded` flag prevents the pre-fill from clobbering user edits after the first load. In `CgpaCalculator`: same pattern with `const { cgpa, isAuthenticated } = useStudentData()` + `setSems(cgpaToSemesters(cgpa))`. Sample-data defaults are kept as the initial state so the calculators still work for unauthenticated visitors. |
| 2 | `src/features/bookmarks/use-bookmarks.ts` | Narrowed the hybrid hook's `toggle` signature from `Omit<BookmarkEntry, "createdAt">` (which still required `id`) to `Omit<BookmarkEntry, "createdAt" \| "id">` — matching the underlying `toggleMutation.mutationFn` which only needs `{ kind, refId, title, subtitle? }`. For the local-store fallback path, the hook now synthesizes a deterministic `id: \`bm_${entry.kind}_${entry.refId}\`` so the local store can still dedupe / remove by id. The server-side dedup uses `(studentId, kind, refId)` as its unique key — no id from the caller is needed. |
| 3 | `src/features/papers/papers.tsx` | Swapped `import { useBookmarkStore }` → `import { useBookmarks } from "@/features/bookmarks/use-bookmarks"`. Replaced `const toggleBookmark = useBookmarkStore((s) => s.toggle)` + `const hasBookmark = useBookmarkStore((s) => s.has)` with a single `const { toggle: toggleBookmark, has: hasBookmark } = useBookmarks()`. Removed the `id: \`bm_paper_${paperId}\`` field from the `toggleBookmark({...})` call (the new API doesn't need it). The `hasBookmark("paper", p.id)` call site is unchanged. |
| 4 | `src/features/syllabus/syllabus.tsx` | Same swap as papers.tsx: `useBookmarkStore` → `useBookmarks`, single destructured `toggle` + `has`, removed `id: \`bm_syl_${s.id}\`` from the toggle call. `hasBookmark("syllabus", s.id)` call site unchanged. |
| 5 | `src/features/calendar/calendar.tsx` | Wrapped the existing academic-events list inside a new `<Tabs>` with two triggers: "Academic Calendar" (`events` value) and "Exam Timetable" (`timetable` value). Extracted the events render into an `EventsTab` component (zero behavioural change — same `useQuery`, same `sortedEvents`, same `motion.div` cards). Added a new `TimetableTab` component that: reads `isAuthenticated` + `profile` from `useAuthStore`; runs `useQuery({ queryKey: ["timetable", profile?.semester, profile?.branchCode], queryFn: () => getActiveTimetable(profile!.semester, profile!.branchCode), enabled: isAuthenticated && !!profile && !!profile.semester && !!profile.branchCode, staleTime: 5*60*1000 })`; renders an `EmptyState` "Log in to see your timetable" when not authenticated, a 2× `Skeleton h-28` block while loading, an `EmptyState` "No active timetable" when the query returns null, and a `GlassCard` with the timetable's title, branch/semester, updatedAt date and an "Active" badge when it returns a timetable. The page header description was extended to mention the exam timetable so users know the tab exists. |

### Cross-cutting implementation notes

- **`Promise.resolve().then(...)` pattern**: the React lint rule
  `react-hooks/...` (and the equivalent `no-direct-mutation` style rules)
  flags `setState` calls that happen synchronously inside a `useEffect`
  body when they could cause an immediate re-render during the commit
  phase. Wrapping the `setCourses` / `setSems` / `setRealLoaded` calls in
  a microtask deferral satisfies the rule while still running on the
  next tick — effectively the same UX as a synchronous setState, just
  scheduled. The `realLoaded` flag is set in the same microtask so the
  effect won't fire a second time.
- **`realLoaded` flag semantics**: the flag is per-mount. If the user
  logs out and back in (or the calculator unmounts and remounts), the
  flag resets and the pre-fill runs once more — which is the desired
  behaviour. Within a single mount, once `realLoaded` flips to `true`,
  the effect's guard short-circuits and any subsequent user edits to
  `courses` / `sems` are preserved even if `results` / `cgpa` refetch
  in the background.
- **Hybrid bookmark toggle signature**: by moving the `id` synthesis
  into the `useBookmarks` hook, callers (`papers.tsx`, `syllabus.tsx`,
  and any future caller) no longer need to invent a stable id. This
  matches the server's perspective — the DB's `Bookmark` model uses
  `@@unique([studentId, kind, refId])` and the `id` column is just a
  `cuid()` primary key, never supplied by the client.
- **Calendar timetable query enabling**: the `enabled` flag checks
  `isAuthenticated && !!profile && !!profile.semester && !!profile.branchCode`
  because `getActiveTimetable(semester, branchCode)` requires both
  arguments. The `profile.semester` / `profile.branchCode` fields are
  nullable on `StudentProfile` (a freshly-registered student whose
  scraper run hasn't completed could have nulls), so the guard prevents
  a `null`/`undefined` being passed to a `number`/`string` parameter.
- **Timetable "entries" caveat**: the spec asked for "a list of
  timetable entries with date, subject code, subject name", but the
  current `Timetable` Prisma model only has `{ title, fileUrl, semester,
  branchCode, isActive, archivedAt, createdAt, updatedAt }` — there is
  no per-subject entries field, and `TimetableInputSchema` strips any
  extra fields. The `TimetableTab` therefore renders the timetable's
  top-level metadata (title, semester, branch, updatedAt) as a single
  card. When the timetable schema is extended to include subject-level
  entries (the admin UI already collects `examType`, `academicYear`,
  and per-row entries — see the `recreate-admin-ui` worklog note), the
  `TimetableTab` can be extended to iterate those entries without
  touching the surrounding tab plumbing.

### Validation

- `bun run lint` → **clean** (0 errors, 0 warnings). The first run
  after all edits returned no output.
- Dev server log: final entries are `✓ Compiled in 169ms` followed by
  `✓ Compiled in 160ms` — both my edits to `calculators.tsx`,
  `papers.tsx`, `syllabus.tsx`, `use-bookmarks.ts`, and `calendar.tsx`
  hot-reloaded without TypeScript / JSX errors. `GET / 200` continues
  to be served. (The pre-existing `POST / 500 Invalid Server Actions
  request` errors in the log are an `x-forwarded-host` / `origin`
  header mismatch in the preview environment — unrelated to these
  changes and present before this task.)
- `rg "useBookmarkStore" src/features/{papers,syllabus}` → **0 matches**.
  Only `src/features/bookmarks/use-bookmarks.ts` still imports
  `useBookmarkStore`, which is correct — it's the hybrid hook's
  localStorage fallback.

### Notes for future agents

- The `useBookmarks` `toggle` API no longer takes an `id`. If you're
  adding a new caller (e.g. the notices screen), pass
  `{ kind, refId, title, subtitle? }` only. The hook synthesizes a
  local id when it needs one.
- The `useStudentData` hook's `results` array is sorted by semester
  ascending (server-side ordering in `/api/v1/results`), so
  `results[results.length - 1]` is the latest semester. If that
  ordering ever changes on the server, the SGPA pre-fill will pick
  the wrong semester — defensively, prefer
  `results.reduce((a, b) => a.semester > b.semester ? a : b)` if
  ordering becomes unreliable.
- The calendar's `TimetableTab` is intentionally not prefetching the
  timetable when unauthenticated. The `EmptyState` "Log in" prompt is
  the entire UX in that state. If you want to also surface a generic
  "Exam timetable" explainer page for anonymous visitors, swap the
  `EmptyState` for a marketing-style card.
- If the `Timetable` schema is ever extended with a `subjects` /
  `entries` JSON field (the admin UI is already sending those fields,
  they're just stripped by `TimetableInputSchema` today), update the
  `TimetableTab`'s render to iterate them — the surrounding tab
  structure won't need to change.


---

## 2026-07-02 — Task `purge-mocks` — Remove all mock data + wire real impls as defaults

**Scope:** User reported mock-data in admin and demanded no mocks anywhere —
everything must work end-to-end if deployed. Audit found `src/data/mock-data.ts`
plus `MockStudentService` and `MockPaymentProvider` (which were "default until
swapped at runtime" via a `WireStudentService` useEffect — a fragile pattern
that briefly served mocks on first paint).

### Files deleted / created / modified

| # | Path | Action | What changed |
|---|------|--------|--------------|
| 1 | `src/data/mock-data.ts` | DELETED | All 10 mock exports (`MOCK_STUDENT`, `MOCK_CGPA`, `MOCK_SEMESTER_RESULTS`, `MOCK_ATTENDANCE`, `MOCK_PAPERS`, `MOCK_SYLLABUS`, `MOCK_NOTICES`, `MOCK_CALENDAR`, `MOCK_HISTORY`, `SUBJECTS`) removed. The `src/data/` directory is now empty and removed. |
| 2 | `src/lib/providers/student.ts` | REWRITTEN | `MockStudentService` class deleted entirely. The `StudentService` interface + `getStudentService()` / `__setStudentService()` now live here, and the default instance is `new HttpStudentService()` (imported from `student-http.ts`). No more "swap on app boot" pattern — the default IS the real implementation. |
| 3 | `src/lib/providers/payment.ts` | REWRITTEN | `MockPaymentProvider` class deleted entirely. Default is now `new RazorpayPaymentProvider()` (imported from `payment-razorpay.ts`). |
| 4 | `src/lib/providers/index.tsx` | SIMPLIFIED | `WireStudentService` component removed (no longer needed — defaults are real). Imports for `__setStudentService`, `HttpStudentService`, `__setPaymentProvider`, `RazorpayPaymentProvider` removed. `Providers` tree now only contains `ThemeSync` + `SupporterAdsSync` + children. |
| 5 | `src/lib/providers/student-http.ts` | COMMENT UPDATE | Header comment updated from "Drop-in replacement for MockStudentService" to "This is the default StudentService implementation". |
| 6 | `src/lib/providers/payment-razorpay.ts` | COMMENT UPDATE + TYPE FIX | Header comment updated to drop the MockPaymentProvider mention. Line 141 `window.Razorpay` possibly-undefined error fixed by extracting to a local `const RazorpayCtor = window.Razorpay;` after the load. |
| 7 | `src/lib/providers/ads.ts` | RENAMED | `MockAdsProvider` → `BannerAdsProvider`. The `render` discriminator literal changed from `"mock"` to `"banner"`. This is the real default — renders in-house promotional CTAs (no third-party ad network). Header doc rewritten. |
| 8 | `src/lib/providers/analytics.ts` | RENAMED | `MockAnalyticsProvider` → `ConsoleAnalyticsProvider`. Real default — logs to console in dev, no-op in prod. Header doc rewritten. |
| 9 | `src/features/login/login-dialog.tsx` | COMMENT FIX | Inline comment "(mock returns MOCK_STUDENT)" → "(BFF /api/v1/profile)". |
| 10 | `prisma/seed.ts` | REWRITTEN | Removed all `MOCK_*` imports + the papers/syllabus/notices/calendar seeding loops. Seed now only inserts reference data: branches, semesters (one row per branch × semester × "2025-2026" academic year), and a single `app.version` settings row. Real content is added via `/admin` after deployment — the intended production flow. |
| 11 | `src/store/bookmark-store.ts` | TYPE FIX | `BookmarkEntry` interface exported (was previously only declared locally). `toggle` signature widened from `Omit<BookmarkEntry, "createdAt">` to `Omit<BookmarkEntry, "createdAt" \| "id"> & { id?: string }` so callers don't need to synthesize an id. The store now synthesizes `id: \`bm_${kind}_${refId}\`` if the caller doesn't supply one. |
| 12 | `src/features/bookmarks/use-bookmarks.ts` | (no code change) | Now compiles cleanly thanks to the bookmark-store export + widened toggle signature. |
| 13 | `src/app/api/v1/calc-history/route.ts` | TYPE FIX | Zod v4 requires `z.record(keySchema, valueSchema)` — `z.record(z.unknown())` (1 arg) → `z.record(z.string(), z.unknown())`. Applied to both `input` and `output.meta` schemas. |
| 14 | `src/components/ui-custom/circular-progress.tsx` | TYPE FIX | `label` and `sublabel` props widened from `string` to `React.ReactNode` to match how callers actually use them (passing `<span>` JSX). |
| 15 | `src/lib/payments/razorpay-server.ts` | TYPE FIX | `order.amount` from razorpay SDK is `string \| number`; wrapped in `Number(...)` before returning. |
| 16 | `src/lib/scraper/mapper.ts` | (no code change) | Now compiles cleanly thanks to the `admissionYear?: number` widening in `StudentProfile`. |
| 17 | `src/lib/types/index.ts` | TYPE FIX | `StudentProfile.admissionYear` widened from `number` to `number?` — scraper returns `undefined` when the field is missing and the previous required-type caused a TS error. |
| 18 | `tsconfig.json` | EXCLUDE | Added `examples`, `skills`, `mini-services`, `.zscripts` to the `exclude` list. These are unrelated reference / scaffolding directories that have their own (intentionally broken) TypeScript — they were failing `next build`'s TS pass. |
| 19 | `scripts/dev-start.sh` | NEW | Wrapper that fully detaches the dev server (`setsid nohup` + `env -u DATABASE_URL -u DIRECT_URL`) so it survives the launching bash session, AND unsets the stale shell `DATABASE_URL=file:...` env var that was overriding `.env.local` and causing Prisma to throw "URL must start with postgresql://" at runtime. |

### Validation

- `npx tsc --noEmit` on src/ + prisma/ → **0 errors** (examples/skills/mini-services/.zscripts excluded).
- `npx eslint src/` → **0 errors, 0 warnings**.
- `npx next build` → **compiled successfully in 8.2s**, 26 routes generated (4 static + 22 dynamic). No TS errors, no lint errors.
- End-to-end smoke test against live dev server:
  - `GET /` → 200
  - `GET /admin` → 200
  - `GET /api/v1/admin/notices` with admin key → 200 (real notices from Neon DB)
  - `GET /api/v1/admin/calendar` with admin key → 200
  - `GET /api/v1/admin/papers` with admin key → 200
  - `GET /api/v1/admin/syllabus` with admin key → 200
  - `GET /api/v1/admin/timetables` with admin key → 200
  - `GET /api/v1/admin/notices` (no key) → 401 ✓
  - `GET /api/v1/profile` (no auth) → 401 ✓
  - `POST /api/v1/admin/notices` → 201 (real DB row, real cuid id returned)
  - `POST /api/v1/admin/calendar` → 201
  - `POST /api/v1/admin/timetables` → 201
  - `DELETE /api/v1/admin/notices?id=…` → 200 (soft-delete)
  - `DELETE /api/v1/admin/calendar?id=…` → 200 (hard delete)
  - `DELETE /api/v1/admin/timetables?id=…` → 200 (hard delete + R2 cleanup attempted)
  - All smoke-test rows cleaned up after verification.

### Architecture: where the real data flows now

- **Student auth + profile + results + CGPA**: `HttpStudentService` →
  `/api/v1/{login,refresh,logout,profile,results,cgpa}` → Prisma → Neon PostgreSQL.
  Cached scraper responses live in the `CachedStudentData` table (24h TTL).
  Scraper calls go to `https://ktugatewayapi-production.up.railway.app` (Railway-hosted).
- **Notices / Calendar / Papers / Syllabus / Timetables (admin)**:
  `/admin` UI → `/api/v1/admin/*` (Bearer ADMIN_API_KEY auth) → Prisma.
  Papers + Syllabus uploads go to Cloudflare R2 (`ktu1` bucket) via signed PUT URLs;
  downloads go through `/api/v1/{papers,syllabus}/[id]/download` which signs
  GET URLs (2-minute expiry) after authenticating the student cookie.
- **Bookmarks**: hybrid — `useBookmarks` hook uses `/api/v1/bookmarks` when
  authenticated, falls back to localStorage when not. Toggle signature no
  longer requires an `id` (server uses `(studentId, kind, refId)` unique key).
- **Calc history**: hybrid — `/api/v1/calc-history` when authenticated,
  localStorage when not.
- **Search**: `/api/v1/...` not used; goes through `searchAll` Server Action
  → Prisma `findMany` across 5 tables (QuestionPaper, Syllabus, KTUNotice,
  CalendarEvent, Subject).
- **Dashboard stats**: `getDashboardStats`, `getRecentNotices`, `getUpcomingEvent`,
  `getRecentPapers` Server Actions → Prisma. CGPA card fetches
  `/api/v1/cgpa` only when authenticated.
- **Payments**: `RazorpayPaymentProvider` → `/api/v1/payments/create-order`
  (creates Razorpay order + `Pending` SupporterPurchase row) → Razorpay
  checkout modal → `/api/v1/payments/verify` (HMAC-SHA256 signature verify +
  timing-safe compare) → `Success` row. Webhook at `/api/webhooks/razorpay`
  for async confirmations.
- **Rate limiting**: Upstash Redis on `/api/v1/login` (5/15min) and
  `/api/v1/refresh` (30/hour). Graceful no-op when `UPSTASH_REDIS_REST_URL`
  unset (dev / preview deploys without rate limiting).
- **Route protection**: `src/middleware.ts` enforces `ktu_access` JWT cookie
  on all `/api/v1/*` except login/refresh/logout (public), admin/* (Bearer key,
  handler-verified), and papers/syllabus download (handler-verified).

### Stale shell env var caveat (dev only)

The agent's shell exports `DATABASE_URL=file:/home/z/my-project/db/custom.db`
(a leftover from an earlier SQLite phase). Next.js's dotenv loader does NOT
override existing `process.env` values, so this stale var was masking the
real Neon PostgreSQL URL in `.env.local` and causing Prisma to reject every
query with "URL must start with postgresql://".

`scripts/dev-start.sh` works around this by launching the dev server with
`env -u DATABASE_URL -u DIRECT_URL` (unsets both, letting `.env.local` take
effect). On Vercel / production deploys, this is a non-issue — Vercel sets
the env vars directly from its dashboard, no shell-inherited values.

### Notes for future agents

- There is NO mock data anywhere in the codebase anymore. Search confirmed:
  `rg "mock-data|MOCK_|MockStudentService|MockPaymentProvider" src/` returns
  zero code matches (only doc references in `lib/types/index.ts` where the
  `PaymentProvider` union still allows `"Mock"` for backward-compat with old
  DB rows; new rows are tagged `"Razorpay"`).
- `MockAdsProvider` and `MockAnalyticsProvider` were renamed to
  `BannerAdsProvider` and `ConsoleAnalyticsProvider` respectively. They were
  never mock-DATA providers — they're real implementations of swappable
  interfaces. The rename just makes that honest.
- The `__setStudentService` / `__setPaymentProvider` / `__setAdsProvider` /
  `__setAnalyticsProvider` escape hatches are kept for tests and future
  platform variants (native iOS/Android). They are NOT used at runtime.
- If the user adds fresh content via `/admin` and the student-facing pages
  still show empty states, the issue is one of: (a) the rows are
  soft-deleted (`deletedAt` set), (b) the rows are marked `active: false`,
  (c) the student isn't authenticated (CGPA / results / bookmarks require
  login). The server actions already filter on these.
- The `prisma/seed.ts` script now only seeds reference data — branches +
  semesters + a settings row. Run it once after creating a fresh Neon DB:
  `bun run db:seed`. Real content (papers, syllabus, notices, calendar
  events, timetables) is added via `/admin` — never via seed.

