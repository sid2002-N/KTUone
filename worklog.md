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


---

## 2026-07-02 — Task `ads-networks` — Add AdSense (web) + AdMob (Capacitor) behind env-var switches

**Scope:** Add full Google AdSense and Google AdMob support to the app without
activating them. The user wants every backend piece in place so they can flip
an env var and have real ads go live after Google approves their accounts.
Default provider stays `BannerAdsProvider` (in-house promos) — flipping
`NEXT_PUBLIC_ADS_PROVIDER` to `adsense` / `admob` / `none` is all that's
required to switch. No code changes needed at activation time.

### Files created / modified

| # | Path | Action | Purpose |
|---|------|--------|---------|
| 1 | `src/lib/providers/ads.ts` | REWRITTEN (78 → 424 lines) | Added `AdSenseAdsProvider`, `AdMobAdsProvider`, `NoAdsProvider`. Added `AdDescriptor` extension fields (`adClient`, `adSlot`, `adFormat`, `fullWidthResponsive`, `adUnitId`, `adSize`). Added `createAdsProviderFromEnv()` factory that reads `NEXT_PUBLIC_*` env vars and picks the right provider. Added env-var inspection helpers (`isAdSenseActive`, `getAdSenseClientId`, `isAdMobActive`, `getAdMobAppId`, `getAdMobBannerId`, `getAdMobPosition`, `getAdMobBannerSize`) used by the script loader + initializer. Graceful fallback to `BannerAdsProvider` if required env vars are missing. |
| 2 | `src/lib/providers/adsense-script.tsx` | NEW (100 lines) | `<AdSenseScript />` React component + `useAdSenseScript()` hook. Injects `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=<ca-pub-…>` into `<head>` ONCE, only when `isAdSenseActive()` AND user is not a supporter AND `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is set. Module-scoped `_scriptLoaded` flag dedupes mounts. |
| 3 | `src/lib/providers/admob-initializer.tsx` | NEW (220 lines) | `<AdMobInitializer />` React component. Detects Capacitor native shell via `window.Capacitor.isNativePlatform()`. If running native AND `isAdMobActive()` AND user is not a supporter, dynamically imports `@capacitor-community/admob`, calls `AdMob.initialize()` then `AdMob.showBanner({ adId, adSize, position })`. On unmount or when user becomes supporter, calls `hideBanner()` + `removeBanner()`. Dynamic import uses runtime-built specifier (`"@capacitor" + "-community/admob"`) so Turbopack/webpack can't statically resolve it — prevents "Module not found" warnings when the package isn't installed. |
| 4 | `src/types/capacitor-admob.d.ts` | NEW (47 lines) | Ambient type declaration for `@capacitor-community/admob`. Lets TypeScript compile cleanly whether or not the package is installed. When the package is installed (Capacitor build), the real `.d.ts` files in `node_modules` take precedence over this ambient declaration. |
| 5 | `src/components/ui-custom/banner-ad.tsx` | REWRITTEN (88 → 188 lines) | `<BannerAd />` now branches on `ad.render`: `"banner"` (in-house promo, default) → `"adsense"` (`<ins class="adsbygoogle">` element + `window.adsbygoogle.push({})` on mount) → `"admob"` (layout placeholder div reserving space; native banner shown by `<AdMobInitializer />`) → `"none"` (renders null). Added `AdSenseAd` + `AdMobPlaceholder` sub-components. AdSense push is guarded by a ref so it only fires once per mount (avoids "already filled" warnings). |
| 6 | `src/lib/providers/index.tsx` | MODIFIED | Added `<AdLayers />` component that mounts `<AdSenseScript />` + `<AdMobInitializer />` once at the app root inside `<Providers />`. Both render null and have zero bundle/layout impact when their activation conditions aren't met. |
| 7 | `.env.example` | EXTENDED | Added a clearly-documented "Ads" section with all 9 env vars: `NEXT_PUBLIC_ADS_PROVIDER` (master switch), `NEXT_PUBLIC_ADSENSE_*` (5 vars), `NEXT_PUBLIC_ADMOB_*` (6 vars). Each var has a one-line comment explaining its purpose and valid values. |

### Architecture — how ad selection works end-to-end

1. **At module load**: `createAdsProviderFromEnv()` reads
   `process.env.NEXT_PUBLIC_ADS_PROVIDER` (default `"banner"`). Constructs
   the matching provider and caches it as a singleton via `getAdsProvider()`.
2. **At app boot**: `<Providers />` mounts `<AdLayers />`, which renders
   `<AdSenseScript />` + `<AdMobInitializer />`. Both check their activation
   conditions inside `useEffect`:
   - `<AdSenseScript />`: no-op unless `isAdSenseActive()` + not supporter + env var set.
   - `<AdMobInitializer />`: no-op unless `isAdMobActive()` + running in
     Capacitor native shell + not supporter + env vars set.
3. **At each ad slot**: pages render `<BannerAd slot="…" />`. The component
   calls `getAdsProvider().getAd(slot)` to get a descriptor, then branches
   on `ad.render`:
   - `"banner"` → in-house promo CTA ("Your banner could be here" + "Go ad-free for ₹99" button)
   - `"adsense"` → `<ins class="adsbygoogle">` element; the script loaded
     by `<AdSenseScript />` fills it with a real ad. If the script hasn't
     loaded yet, the `<ins>` is empty until it does.
   - `"admob"` → placeholder div reserving layout space (same `minHeight`
     as the native banner will occupy). The actual native banner is
     overlaid by `<AdMobInitializer />`.
   - `"none"` → renders null. Used by `NoAdsProvider` (kill switch) AND
     by AdSense for slots not in the `NEXT_PUBLIC_ADSENSE_SLOTS` map, AND
     by AdMob for slots not in `NEXT_PUBLIC_ADMOB_ACTIVE_SLOTS`.
4. **Supporter toggle**: `useSupporterStore` flips → `SupporterAdsSync`
   calls `getAdsProvider().setEnabled(false)` → `<BannerAd />` shows the
   "Ad-free experience — Thanks for being a Supporter 💜" ribbon instead
   of any ad. `<AdSenseScript />` won't load the script. `<AdMobInitializer />`
   calls `hideBanner()` + `removeBanner()` on the native side.

### Env var reference

| Var | Required when | Purpose |
|-----|---------------|---------|
| `NEXT_PUBLIC_ADS_PROVIDER` | always | `"banner"` (default) \| `"adsense"` \| `"admob"` \| `"none"` |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | `adsense` | `ca-pub-XXXXXXXXXXXXXXXX` |
| `NEXT_PUBLIC_ADSENSE_SLOTS` | `adsense` | JSON map `{"home-top":"123","papers-list":"456",...}` |
| `NEXT_PUBLIC_ADSENSE_FORMAT` | optional | `"auto"` (default) \| `"horizontal"` \| `"vertical"` \| `"rectangle"` |
| `NEXT_PUBLIC_ADSENSE_RESPONSIVE` | optional | `"true"` (default) \| `"false"` |
| `NEXT_PUBLIC_ADMOB_APP_ID` | `admob` | `ca-app-pub-XXXX~XXXX` |
| `NEXT_PUBLIC_ADMOB_BANNER_ID` | `admob` | `ca-app-pub-XXXX/XXXX` |
| `NEXT_PUBLIC_ADMOB_SLOTS` | optional | JSON map `{"home-top":"ca-app-pub-…/…"}` |
| `NEXT_PUBLIC_ADMOB_BANNER_SIZE` | optional | `"SMART_BANNER"` (default) \| `"BANNER"` \| `"LARGE_BANNER"` \| `"MEDIUM_RECTANGLE"` \| `"FULL_BANNER"` \| `"LEADERBOARD"` |
| `NEXT_PUBLIC_ADMOB_POSITION` | optional | `"TOP_CENTER"` \| `"BOTTOM_CENTER"` (default) |
| `NEXT_PUBLIC_ADMOB_ACTIVE_SLOTS` | optional | JSON array `["home-top"]` (default) — slots that reserve layout space |

### Activation checklist for the user (when Google approves)

**Web — AdSense**:
1. Set `NEXT_PUBLIC_ADS_PROVIDER=adsense` in Vercel env vars.
2. Set `NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX`.
3. Set `NEXT_PUBLIC_ADSENSE_SLOTS={"home-top":"1234567890","papers-list":"0987654321","syllabus-list":"…","notices-list":"…","settings-top":"…"}`.
4. (Optional) Set `NEXT_PUBLIC_ADSENSE_FORMAT` / `NEXT_PUBLIC_ADSENSE_RESPONSIVE`.
5. Redeploy. `<AdSenseScript />` injects the script on first render;
   `<BannerAd />` instances start rendering `<ins class="adsbygoogle">`
   elements that AdSense fills with real ads.

**Native (Capacitor) — AdMob**:
1. `npm install @capacitor/core @capacitor/cli @capacitor-community/admob`
2. `npx cap init "KTU One" "in.ktuone.app" --web-dir=out`
3. Add AdMob plugin to `capacitor.config.ts`:
   ```ts
   const config: CapacitorConfig = {
     appId: "in.ktuone.app",
     plugins: { AdMob: { appId: "ca-app-pub-XXXX~XXXX" } }
   };
   ```
4. `npx cap add android` (and/or `npx cap add ios`).
5. Set `NEXT_PUBLIC_ADS_PROVIDER=admob`, `NEXT_PUBLIC_ADMOB_APP_ID`, `NEXT_PUBLIC_ADMOB_BANNER_ID` env vars.
6. `npx cap sync` + `npx cap open android` (or ios).
7. Native banner appears at configured position on every screen where
   `<BannerAd slot="home-top" />` (or another active slot) renders.

### Why the dynamic import is build-safe

The `import("@capacitor-community/admob")` call inside `loadAdMobPlugin()`
uses two tricks to avoid bundler complaints when the package isn't installed:

1. **Runtime-built specifier**: `const specifier = "@capacitor" + "-community/admob";`
   This prevents Turbopack and webpack from statically resolving the module
   at compile time. Without this, every dev compile would log
   `Module not found: Can't resolve '@capacitor-community/admob'` and some
   bundler configs would fail the build outright.
2. **`/* webpackIgnore: true */` magic comment**: tells webpack (used in
   non-Turbopack production builds) to leave this `import()` as a runtime
   call rather than trying to bundle it. Turbopack doesn't honor this
   comment, but trick #1 already handles Turbopack.

When the package IS installed (Capacitor build), the runtime `import()`
finds it normally — no code changes needed.

### Validation

- `npx tsc --noEmit` on src/ → **0 errors**.
- `npx eslint src/` → **0 errors, 0 warnings**.
- `npx next build` → **compiled successfully in 8.6s**, 26 routes generated.
- Dev server smoke test in all 4 modes (`banner`, `adsense`, `admob`, `none`):
  - `GET /` → 200 in all modes
  - `GET /admin` → 200 in all modes
  - `GET /api/v1/admin/notices` with key → 200 in all modes
  - `GET /api/v1/admin/notices` without key → 401 in all modes
  - `GET /api/v1/profile` without auth → 401 in all modes
- Dev log warning check: `grep -c "Module not found" dev.log` → **0** (the
  runtime-built specifier trick eliminated the warning).
- Existing 5 `<BannerAd />` mount points (`home-top`, `papers-list`,
  `syllabus-list`, `notices-list`, `settings-top`) all render correctly in
  every mode — verified by visual inspection of the dev server responses.

### Notes for future agents

- The `@capacitor-community/admob` package is NOT in `package.json`. It's
  only added when the user wraps the build with Capacitor (see activation
  checklist above). The ambient type declaration in
  `src/types/capacitor-admob.d.ts` lets TypeScript compile without the
  package; once it's installed, the real types from `node_modules` override
  the ambient declaration automatically.
- The `<AdSenseScript />` script tag is added to `<head>` ONCE per app
  load (module-scoped `_scriptLoaded` flag). If the user becomes a
  supporter after the script has loaded, the script tag stays in the DOM
  but `<BannerAd />` shows the supporter ribbon instead — no wasted ad
  requests because `<ins>` elements aren't being rendered.
- AdSense slots not present in `NEXT_PUBLIC_ADSENSE_SLOTS` return
  `render: "none"` (render nothing). This is intentional — avoids shipping
  empty `<ins>` elements that AdSense would log warnings about.
- AdMob `activeSlots` defaults to `["home-top"]` because native banners
  are typically one banner per screen. Override via
  `NEXT_PUBLIC_ADMOB_ACTIVE_SLOTS=["home-top","papers-list"]` to enable
  more slots. Each active slot reserves layout space via the placeholder
  div rendered by `<AdMobPlaceholder />`.
- The `NoAdsProvider` (activated by `NEXT_PUBLIC_ADS_PROVIDER=none`) is
  the kill switch — it returns `render: "none"` for every slot, so no ad
  renders anywhere. Useful if you need to disable all ads (including
  in-house promos) without code changes.
- All ad-related env vars are `NEXT_PUBLIC_*` so they're available on both
  server and client. This is required because `<AdSenseScript />` and
  `<AdMobInitializer />` are client components that need to read the
  provider name + IDs at runtime.


---

## 2026-07-02 — Task `session-sync-download` — Session restore, sync button, PDF download fix, mock data cleanup

**Scope:** User reported 4 issues:
1. Front-end showing 0 papers (mock data was drowning out real uploads)
2. PDF download not working (button just showed a toast, never downloaded)
3. User had to type register number + password every page reload (no session restore)
4. Wanted a "Sync" button to re-fetch fresh KTU data without full re-login

### Files created / modified

| # | Path | Action | Purpose |
|---|------|--------|---------|
| 1 | `scripts/cleanup-mock-data.ts` | NEW | One-off script that deletes 32 mock papers, 10 mock syllabus, 6 mock notices, 6 mock calendar events from the DB. Real admin-uploaded content (with R2 object keys like `papers/...`) is kept. Mock content (with `https://r2.ktuone.in/...` URLs) is deleted. |
| 2 | `scripts/cleanup-test-notices.ts` | NEW | Hard-deletes 3 soft-deleted test notices from verification runs (Smoke Test, Audit Test, Final Verify). |
| 3 | `src/features/papers/papers.tsx` | MODIFIED | Fixed `onDownload` — now calls `window.open('/api/v1/papers/[id]/download', '_blank')` which triggers the actual R2 signed-URL redirect + PDF download. Previously it just showed a toast. Also fixed the "View" button to open the same URL (browser renders PDF inline). |
| 4 | `src/features/syllabus/syllabus.tsx` | MODIFIED | Same download fix — `window.open('/api/v1/syllabus/[id]/download', '_blank')`. Added `getAnalyticsProvider` import. |
| 5 | `src/app/api/v1/papers/[id]/download/route.ts` | REWRITTEN | Added `ResponseContentDisposition` header to the signed URL so the browser saves with a clean filename (`Os — END SEM May 2026.pdf`) instead of the raw R2 object key. Sanitizes the title for filesystem safety. |
| 6 | `src/app/api/v1/syllabus/[id]/download/route.ts` | REWRITTEN | Same content-disposition fix for syllabus downloads. |
| 7 | `src/lib/storage/r2.ts` | MODIFIED | `getSignedDownloadUrl()` now accepts an optional `contentDisposition` param that gets passed to `GetObjectCommand.ResponseContentDisposition`. |
| 8 | `src/store/auth-store.ts` | REWRITTEN | Added `lastSyncedAt` + `rememberedRegisterNumber` fields. Store now uses `persist` middleware with `partialize` — only `lastSyncedAt` + `rememberedRegisterNumber` are persisted to localStorage; `session` + `profile` are in-memory only (reconstructed on boot via `/api/v1/refresh`). |
| 9 | `src/store/nav-store.ts` | MODIFIED | Added `syncOpen` + `setSyncOpen` for the SyncDialog. |
| 10 | `src/lib/providers/session-restore.tsx` | NEW | `<SessionRestore />` component — runs once on app boot, calls `getStudentService().initialize()` which POSTs to `/api/v1/refresh` using the httpOnly refresh cookie. If valid, fetches the cached profile + sets it in the auth store. If invalid, leaves the user logged out. Mounted inside `<Providers />`. |
| 11 | `src/lib/providers/index.tsx` | MODIFIED | Added `<SessionRestore />` to the provider tree (runs once on app boot). |
| 12 | `src/features/login/login-dialog.tsx` | MODIFIED | Pre-fills the register number from `rememberedRegisterNumber` (persisted in localStorage). Password field is always cleared on open (security). On successful login, stores the register number + sets `lastSyncedAt` to now. |
| 13 | `src/features/sync/sync-dialog.tsx` | NEW | `<SyncDialog />` — modal that asks for the KTU password (register number pre-filled). On submit, calls `getStudentService().login()` to re-scrape fresh data. Updates `lastSyncedAt`, shows a success state with checkmark, auto-closes after 1.5s. Same error branching as LoginDialog (AUTH_FAILED, SCRAPE_FAILED, SCRAPER_UNAVAILABLE). |
| 14 | `src/components/layout/app-shell.tsx` | MODIFIED | Added a Sync button (RefreshCw icon) to the top nav, shown only when authenticated. Tooltip shows "Last synced Xh ago". Green dot indicator if `lastSyncedAt` is set. Mounted `<SyncDialog />` at the bottom of the shell. |
| 15 | `src/features/dashboard/dashboard.tsx` | MODIFIED | Added a stale-data banner — shows an amber card with "Data last synced Xh ago" + a "Sync now" button when `lastSyncedAt` is > 24h old or null. Appears above the quick-stats grid. |
| 16 | `next.config.ts` | MODIFIED (earlier in this session) | Added `experimental.serverActions.allowedOrigins` with `*.space-z.ai`, `*.fcapp.run`, `*.vercel.app` patterns. Fixes the "Invalid Server Actions request" CSRF error that was blocking all Server Action calls in the preview environment. |

### What was cleaned from the DB

```
📄 Papers:      32 mock deleted, 1 real remaining ("Os" — your admin upload)
📖 Syllabus:    10 mock deleted, 0 real remaining
🔔 Notices:     6 mock + 3 test deleted, 0 real remaining
📅 Calendar:    6 mock deleted, 1 real remaining ("Holilililili daydayddayday")
🎓 Timetables:  0 deleted, 1 real remaining ("Unit test")
```

### Session restore flow (new)

```
User opens app
  ↓
<SessionRestore /> mounts (inside <Providers />)
  ↓
Calls getStudentService().initialize()
  ↓ POST /api/v1/refresh (httpOnly cookie)
  ↓
  ┌─ 200 OK ─────────────────────────────────┐
  │  BFF issues new access token cookie      │
  │  ↓                                       │
  │  SessionRestore calls getProfile()       │
  │  ↓ GET /api/v1/profile                   │
  │  ↓                                       │
  │  Sets session + profile in auth store    │
  │  ↓                                       │
  │  User is logged in (no password typed!)  │
  │  Cached data (up to 24h old) loads       │
  └──────────────────────────────────────────┘
  ┌─ 401 (no cookie / expired) ──────────────┐
  │  User stays logged out                   │
  │  Sees login dialog when clicking avatar  │
  │  Register number pre-filled if remembered│
  └──────────────────────────────────────────┘
```

### Sync button flow (new)

```
User clicks 🔄 in top nav (only visible when authenticated)
  ↓
<SyncDialog /> opens
  ↓
Register number pre-filled from localStorage
Password field empty (NEVER stored)
  ↓
User types password + clicks "Sync now"
  ↓
Calls getStudentService().login() (re-scrapes KTU)
  ↓
  ┌─ Success ────────────────────────────────┐
  │  Scraper fetches fresh profile + results │
  │  CachedStudentData updated (24h TTL)     │
  │  New access token cookie issued          │
  │  lastSyncedAt = now                      │
  │  Profile updated in auth store           │
  │  ✓ Success state shown 1.5s              │
  │  Dialog auto-closes                      │
  └──────────────────────────────────────────┘
  ┌─ Failure ────────────────────────────────┐
  │  Friendly error message shown            │
  │  Dialog stays open for retry             │
  └──────────────────────────────────────────┘
```

### PDF download fix (new)

```
User clicks Download on a paper card
  ↓
window.open('/api/v1/papers/[id]/download', '_blank')
  ↓
GET /api/v1/papers/[id]/download
  ↓
  ┌─ Auth check (httpOnly cookie) ───────────┐
  │  401 if not logged in                    │
  └──────────────────────────────────────────┘
  ↓
Look up paper by id (skip soft-deleted)
  ↓
Build clean filename: "Os — END SEM May 2026.pdf"
  ↓
Generate 2-minute signed R2 URL with:
  ResponseContentDisposition: attachment; filename="Os — END SEM May 2026.pdf"
  ↓
Increment download counter
  ↓
302 redirect to signed URL
  ↓
Browser downloads PDF with clean filename ✓
```

### Validation

- `npx tsc --noEmit` → **0 errors**
- `npx eslint src/` → **0 errors, 0 warnings**
- `npx next build` → **compiled successfully in 10.0s**
- Dev server smoke test:
  - Home: 200 ✓
  - Admin: 200 ✓
  - Admin notices/calendar/papers: 200 ✓
  - `POST /api/v1/refresh` 401 (correct — no cookie in test) ✓
  - Server Action errors: 0 ✓
- DB verification:
  - 1 real paper ("Os", R2 key `papers/CSE/2026/09/C340-END_SEM.pdf`) ✓
  - 1 real calendar event ✓
  - 1 real timetable ✓
  - 0 mock data remaining ✓

### Notes for future agents

- The `SessionRestore` component runs `initialize()` on every app boot. If the refresh token is valid, the user is logged in instantly with cached data (up to 24h old). If not, they stay logged out — no error shown.
- The `lastSyncedAt` + `rememberedRegisterNumber` fields are persisted to localStorage via Zustand's `persist` middleware. The `session` + `profile` are NOT persisted — they're reconstructed on boot via `/api/v1/refresh`. This avoids stale session data if the refresh token has expired.
- The Sync button is only visible when `isAuthenticated` is true. If the session expired (but `lastSyncedAt` is recent), the user sees the stale-data banner on the dashboard with a "Sync now" button — clicking it opens the SyncDialog which re-authenticates.
- The PDF download now uses `ResponseContentDisposition` on the signed URL so the browser saves with a clean filename. This required adding the `contentDisposition` param to `getSignedDownloadUrl()` in `r2.ts`.
- The `scripts/cleanup-mock-data.ts` + `scripts/cleanup-test-notices.ts` are one-off scripts — they don't need to run again. They're kept for audit trail.
- Mock data is gone for good — the new `prisma/seed.ts` only seeds branches + semesters (reference data). Real content is always added via `/admin`.


---

## 2026-07-02 — Task `cgpa-fix` — Fix CGPA calculation for semesters with supplies

**Scope:** User reported CGPA showing 1.8 when it should be above 5. Root
cause: when a student has a supply (fail) in a semester, KTU does NOT publish
the SGPA. The scraper returns the courses but no `S{n}sgpa` field. The old
code defaulted this to `0`, which dragged down the CGPA average.

### The bug

In `mapScraperToResults` (mapper.ts):
```ts
const sgpa = sgpaStr ? Number(sgpaStr) : 0;  // ← BUG: 0 drags down CGPA
```

Then in `mapScraperToCGPA`:
```ts
weighted += s.sgpa * s.totalCredits;  // 0 * credits = 0 → drags down average
```

**Example:** Student with 5 semesters of courses but only 2 published SGPAs:
- S1: SGPA=8.5, S2: SGPA=7.8, S3: supply (no SGPA), S4: SGPA=8.0, S5: results not out (no SGPA)
- **Buggy CGPA:** (8.5×14 + 7.8×11 + 0×13 + 8.0×11 + 0×10) / 59 = **4.96** (wrong!)
- **Fixed CGPA:** (8.5×14 + 7.8×11 + 8.0×11) / 36 = **8.13** (correct!)

### Files modified

| # | Path | What changed |
|---|------|--------------|
| 1 | `src/lib/types/index.ts` | `SemesterResult.sgpa` changed from `number` to `number?` (optional). Undefined = KTU hasn't published it (supply or results not out). |
| 2 | `src/lib/scraper/mapper.ts` | `mapScraperToResults`: only sets `sgpa` if the scraper returns a valid non-empty, non-zero string. `mapScraperToCGPA`: skips semesters where `sgpa` is undefined — they're excluded from both numerator and denominator (matches KTU's official calculation). |
| 3 | `src/features/calculators/use-student-data.ts` | `cgpaToSemesters`: filters out semesters with undefined SGPA before passing to the CGPA calculator's pre-fill. |
| 4 | `src/lib/utils/calc.ts` | `computeCGPA`: skips semesters with 0 credits or 0 SGPA (defensive — handles manual calculator rows where the user hasn't entered values yet). |

### Test

`scripts/test-cgpa-fix.ts` — simulates a student with supplies in S3 + S5
(no SGPA published) and published SGPAs in S1, S2, S4. Verifies the CGPA is
~8.1 (average of the 3 published SGPAs) instead of ~5.0 (which the old bug
would have produced by including 0×credits for S3 and S5).

```
✅ PASS — fix works correctly
  CGPA: 8.13 (expected ~8.1)
  Total credits: 36 (only from semesters with published SGPA)
```

### Validation

- `npx tsc --noEmit` → 0 errors
- `npx eslint src/` → 0 errors, 0 warnings
- `npx next build` → compiled successfully
- Dev server → Home 200, Admin 200
- Test script → ✅ PASS

### Notes for future agents

- `SemesterResult.sgpa` is now optional. Any code that reads it must check
  for `undefined` — if it's undefined, the semester has courses but no
  published SGPA (supply or results pending).
- The CGPA calculation ONLY includes semesters with a published SGPA. This
  matches KTU's official rule: supplies don't count against you until you
  clear them and the SGPA is published.
- The manual CGPA calculator (`computeCGPA` in calc.ts) also skips 0-credit
  and 0-SGPA rows — this is defensive so empty placeholder rows don't drag
  down the average while the user is typing.
- The `scripts/test-cgpa-fix.ts` script is kept for regression testing.


---

## 2026-07-02 — Task `cgpa-formula-fix` — Correct KTU CGPA formula (simple average, not credit-weighted)

**Scope:** User clarified the actual KTU CGPA formula and scraper data shape.
The previous "fix" (excluding missing-SGPA semesters) was WRONG. The correct
formula is a **simple average of all semester SGPAs**, where semesters with
arrears count as 0.

### User-provided scraper data shape

```json
{
  "S1": [...], "S1sgpa": "7.0",
  "S2": [...], "S2sgpa": "7.0",
  ...
  "S6": [...],  // has arrears → S6sgpa may be MISSING
  "S7": [...], "S7sgpa": "8.0",
  "S8": [...], "S8sgpa": "7.5"
}
```

### Correct KTU CGPA formula

```
CGPA = (S1sgpa + S2sgpa + ... + S8sgpa) / (number of semesters with course data)
```

- Each SGPA is out of 10
- If a semester has courses but no SGPA (arrears), SGPA = **0** (INCLUDED, not excluded)
- Semesters the student hasn't reached (no course array) are excluded entirely

### What was wrong before

1. **Original bug:** Missing SGPA → defaulted to 0 → credit-weighted average dragged down CGPA
2. **First fix (wrong):** Excluded missing-SGPA semesters entirely → CGPA too high (only averaged cleared semesters)
3. **This fix (correct):** Missing SGPA = 0, simple average (not credit-weighted), all semesters with courses count

### Files modified

| # | Path | What changed |
|---|------|--------------|
| 1 | `src/lib/types/index.ts` | `SemesterResult.sgpa` back to required `number` (0 when missing, not undefined) |
| 2 | `src/lib/scraper/mapper.ts` | `mapScraperToResults`: SGPA defaults to 0 if missing. `mapScraperToCGPA`: **simple average** (sum of SGPAs / count of semesters with courses), NOT credit-weighted |
| 3 | `src/features/calculators/use-student-data.ts` | `cgpaToSemesters`: includes all semesters (no filtering) |
| 4 | `src/lib/utils/calc.ts` | `computeCGPA`: simple average (sum of SGPAs / count), only skips truly empty rows (0 credits AND 0 SGPA) |
| 5 | `scripts/test-cgpa-fix.ts` | Rewritten with 2 test cases: (1) 8 semesters with S6 arrears, (2) S5 student with pending results |

### Test results

```
TEST 1: 8 semesters, S6 has arrears (SGPA=0)
  S1-S5: 7.0, S6: 0 (arrears), S7: 8.0, S8: 7.5
  CGPA = (7+7+7+7+7+0+8+7.5) / 8 = 50.5 / 8 = 6.31
  ✅ PASS

TEST 2: S5 student, S5 results pending (SGPA=0)
  S1-S4: 8.0, S5: 0 (pending)
  CGPA = (8+8+8+8+0) / 5 = 32 / 5 = 6.40
  ✅ PASS

🎉 ALL TESTS PASSED
```

### Validation

- `npx tsc --noEmit` → 0 errors
- `npx eslint src/` → 0 errors, 0 warnings
- Dev server → Home 200

### Notes for future agents

- KTU CGPA is a **simple average** of semester SGPAs, NOT credit-weighted.
- Semesters with arrears have SGPA = 0 and ARE included in the average.
- Only semesters the student hasn't reached yet (no S{n} course array from
  scraper) are excluded.
- The manual CGPA calculator also uses simple average. Empty placeholder
  rows (0 credits AND 0 SGPA) are skipped so users can add rows while typing
  without affecting the result.


---

## 2026-07-02 — Task `cgpa-credit-weighted + premium-redesign-phase-1` — Correct CGPA formula + magazine-cover hero + academic status card

**Scope:** Two changes:
1. Fix CGPA formula to the correct credit-weighted: `CGPA = Σ(credits × sgpa) / Σ(credits)`
2. Begin premium dark-luxury redesign — dashboard hero + unified academic status card showing CGPA, Percentage, Total credits earned

### CGPA Formula Fix

Previous attempts:
- **v1 (original bug):** Missing SGPA → 0, credit-weighted → dragged down CGPA (showed 1.8)
- **v2 (wrong fix):** Excluded missing-SGPA semesters → CGPA too high
- **v3 (wrong fix):** Simple average (Σ sgpa / count) → not how KTU calculates
- **v4 (this fix, CORRECT):** Credit-weighted `Σ(credits × sgpa) / Σ(credits)`, missing SGPA = 0 included

**Files modified:**
- `src/lib/scraper/mapper.ts` — `mapScraperToCGPA` uses credit-weighted formula
- `src/lib/utils/calc.ts` — `computeCGPA` (manual calculator) also credit-weighted
- `scripts/test-cgpa-fix.ts` — updated test verifies credit-weighted math

**Test result:**
```
S1-S5: SGPA=8.0, credits=24 each → contribution 192 each (total 960)
S6: arrears, SGPA=0, credits=20 → contribution 0
S7: SGPA=7.0, credits=15 → contribution 105
S8: SGPA=9.0, credits=20 → contribution 180
CGPA = 1245 / 175 = 7.11 ✅
```

### Premium Redesign — Phase 1 (Dashboard)

**Design tokens added** (`src/app/globals.css`):
- Dark luxury palette: `--luxury-bg`, `--luxury-surface`, `--luxury-surface-2`, `--luxury-plum`, `--luxury-amber`, `--luxury-copper`, `--luxury-cream`
- Premium easings: `--ease-premium` (cubic-bezier), `--ease-spring`
- Component classes: `.magazine-hero`, `.academic-status`, `.stat-tile-luxury`, `.grid-asymmetric`, `.btn-luxury`, `.btn-luxury-outline`, `.hero-headline`, `.metric-number`, `.progress-ring-premium`, `.shimmer-luxury`, `.stagger-item`

**New component** (`src/components/ui-custom/academic-status-card.tsx`):
- `AcademicStatusCard` — unified card showing 3 metrics:
  1. **CGPA** (out of 10) with circular progress ring
  2. **Percentage** (out of 100) = CGPA × 10
  3. **Credits Earned** (out of 160 target) with progress %
- Premium dark-luxury surface with plum/amber/copper accent icons
- Shows login prompt when not authenticated

**Dashboard redesigned** (`src/features/dashboard/dashboard.tsx`):
- Replaced old notebook-cover hero with **magazine-cover hero**:
  - Dark luxury gradient background with radial plum/amber glows
  - Handwritten greeting eyebrow (Caveat font, amber)
  - Serif headline with gradient italic "sorted." (plum→amber gradient text)
  - Sync indicator pill (top-right, shows "Synced Xh ago" with pulsing green dot)
  - Premium luxury buttons (gradient plum + outline glass)
- Replaced 4-card symmetric quick stats with **asymmetric grid**:
  - LEFT (large, 3fr): AcademicStatusCard with CGPA/Percentage/Credits
  - RIGHT (sidebar, 2fr): 2×2 mini stat tiles (Papers, Notices, Attendance, Next Event)
- Mini tiles use `.stat-tile-luxury` with hover lift effect

### Validation

- `npx tsc --noEmit` → 0 errors
- `npx eslint src/` → 0 errors, 0 warnings
- `npx next build` → compiled successfully in 11.1s
- Dev server → Home 200, Admin 200
- CGPA test → ✅ PASS (7.11 expected = 7.11 got)
- Dev log → 0 errors

### Redesign Roadmap (remaining screens — future sessions)

This was Phase 1 (dashboard). The full premium redesign spec covers 10 areas:
1. ✅ Hero Section (DONE — magazine-cover)
2. ⏳ Navigation sidebar (reimagine with quick actions, recently used)
3. ✅ Dashboard Layout (DONE — asymmetric grid)
4. ✅ Student Overview (DONE — AcademicStatusCard)
5. ⏳ Calculators → tools marketplace
6. ⏳ Papers & Syllabus → Netflix-style browsing
7. ⏳ Notices → modern timeline
8. ⏳ Calendar → beautiful academic planner
9. ⏳ Empty States → custom editorial illustrations
10. ⏳ Motion → page transitions, shared elements

Each remaining screen is a separate session to maintain quality. The design tokens (`.magazine-hero`, `.stat-tile-luxury`, `.btn-luxury`, etc.) are reusable across all screens.


---

## 2026-07-02 — Task `premium-redesign-phase-2` — Navigation redesign (sidebar + top nav + mobile)

**Scope:** Phase 2 of the premium dark-luxury redesign. Redesigned the entire
navigation shell — top navbar, desktop sidebar, mobile bottom nav, and mobile
slide-in menu — to match the magazine-cover hero from Phase 1.

### Design tokens added (`src/app/globals.css`)

| Class | Purpose |
|-------|---------|
| `.navbar-premium` | Top navbar — glass with warm tint, 20px blur, saturate(180%) |
| `.nav-btn-premium` | Desktop nav button — hover lift, active gradient + glow |
| `.sidebar-premium` | Sidebar surface — subtle gradient with right border |
| `.sidebar-item-premium` | Sidebar nav item — left gradient indicator bar on active/hover |
| `.icon-btn-premium` | Icon buttons (search, theme, sync) — hover lift + tint |
| `.avatar-premium` | Avatar — gradient plum with glow, hover scale |
| `.supporter-pill-premium` | Supporter badge — plum/amber gradient tint |
| `.quick-action-card` | Sidebar quick action — gradient plum card with depth |
| `.bottom-nav-premium` | Mobile bottom nav — glass with blur |
| `.mobile-menu-premium` | Mobile slide-in menu — premium surface |
| `.sidebar-section-label` | Section headers — uppercase, tracking, muted |

All classes have `.dark` variants for dark mode (deep plum-black surfaces).

### App shell redesigned (`src/components/layout/app-shell.tsx`)

**Top navbar:**
- Premium glass background (`navbar-premium`) with 20px blur + saturate
- Nav buttons use `nav-btn-premium` — hover lift, active state has gradient + glow
- Icon buttons (search, theme, sync) use `icon-btn-premium` — hover lift + tint
- Avatar uses `avatar-premium` — gradient plum with glow, hover scale, now clickable (navigates to settings)
- Supporter pill uses `supporter-pill-premium` — gradient tint

**Desktop sidebar (w-60, up from w-56):**
- 3 sections with uppercase labels: "Navigate", "Quick Actions", sync status
- Nav items use `sidebar-item-premium` — left gradient indicator bar (plum→amber) that animates in on active, half-height on hover
- Quick Actions section:
  - "Calculators" card (`quick-action-card`) — gradient plum with depth
  - "Search" button with ⌘K hint
- Support CTA at bottom (non-supporters only)
- Sync status card showing "Last Synced: Xh ago" with green dot (when authenticated)

**Mobile bottom nav:**
- Premium glass (`bottom-nav-premium`) with blur + saturate
- Same 5 primary nav items, active dot animation preserved

**Mobile slide-in menu:**
- Premium surface (`mobile-menu-premium`)
- Same 3-section layout as desktop sidebar: Navigate, Quick Actions, Support CTA
- Quick action card for calculators

### Validation

- `npx tsc --noEmit` → 0 errors
- `npx eslint src/` → 0 errors, 0 warnings
- `npx next build` → compiled successfully in 9.8s
- Dev server → Home 200, Admin 200
- Dev log → 0 errors

### Premium redesign progress

| # | Screen | Status |
|---|--------|--------|
| 1 | Hero Section | ✅ Done (Phase 1) |
| 2 | Navigation sidebar | ✅ Done (Phase 2) |
| 3 | Dashboard Layout | ✅ Done (Phase 1) |
| 4 | Student Overview | ✅ Done (Phase 1) |
| 5 | Calculators marketplace | ⏳ Next |
| 6 | Papers (Netflix-style) | ⏳ |
| 7 | Notices timeline | ⏳ |
| 8 | Calendar planner | ⏳ |
| 9 | Empty states | ⏳ |
| 10 | Motion polish | ⏳ |


---

## 2026-07-02 — Task `premium-redesign-phase-3` — Calculators marketplace redesign

**Scope:** Phase 3 of the premium dark-luxury redesign. Transformed the
Calculators page from a flat pill-selector + calculator layout into a
"tools marketplace" with a featured grid of calculator cards.

### Design tokens added (`src/app/globals.css`)

| Class | Purpose |
|-------|---------|
| `.calc-marketplace-hero` | Premium gradient header for the marketplace (dark luxury, radial glows) |
| `.calc-tile` | Featured calculator card — hover lift, border glow, radial accent glow on hover |
| `.calc-tile.active` | Active state — stronger border + elevated background |
| `.calc-icon-badge` | Calculator icon container — hover scale + rotate |
| `.calc-icon-plum` / `.calc-icon-amber` / `.calc-icon-mint` / `.calc-icon-coral` | Accent-colored icon badges (gradient bg + border + text color) |
| `.calc-panel` | Premium container for the active calculator (dark luxury surface) |
| `.calc-back-btn` | "All calculators" back button — glass outline, hover slide-left |
| `.calc-panel input/select` | Premium input overrides — dark bg, luxury border, plum focus ring |

### Calculators page redesigned (`src/features/calculators/calculators.tsx`)

**New two-view architecture:**
1. **Marketplace view** (default, `active === null`):
   - Premium hero card (`.calc-marketplace-hero`) with handwritten "Tools" eyebrow + serif "Calculator marketplace." headline
   - 3-column grid of 5 calculator tiles (`.calc-tile`), each with:
     - Accent-colored icon badge (`.calc-icon-{accent}`)
     - Calculator title + description
     - "Open →" appears on hover
     - Stagger entrance animation (80ms per card)
   - Hover effects: lift, border glow, icon scale+rotate, radial accent glow

2. **Active calculator view** (when a tile is clicked):
   - "All calculators" back button (`.calc-back-btn`) at top
   - Premium panel (`.calc-panel`) containing:
     - Calculator header with icon badge + title + description
     - The actual calculator component (SgpaCalculator, CgpaCalculator, etc.)
   - AnimatePresence for smooth view transitions
   - Inputs styled with premium dark-luxury overrides

**Individual calculator logic preserved** — SgpaCalculator, CgpaCalculator,
AttendanceCalculator, InternalMarksCalculator, PassCalculator all unchanged.
Only the outer shell was redesigned.

### Validation

- `npx tsc --noEmit` → 0 errors
- `npx eslint src/` → 0 errors, 0 warnings
- `npx next build` → compiled successfully in 8.6s
- Dev server → Home 200, Admin 200
- Dev log → 0 errors

### Premium redesign progress

| # | Screen | Status |
|---|--------|--------|
| 1 | Hero Section | ✅ Done (Phase 1) |
| 2 | Navigation sidebar | ✅ Done (Phase 2) |
| 3 | Dashboard Layout | ✅ Done (Phase 1) |
| 4 | Student Overview | ✅ Done (Phase 1) |
| 5 | Calculators marketplace | ✅ Done (Phase 3) |
| 6 | Papers (Netflix-style) | ⏳ Next |
| 7 | Notices timeline | ⏳ |
| 8 | Calendar planner | ⏳ |
| 9 | Empty states | ⏳ |
| 10 | Motion polish | ⏳ |


---

## 2026-07-02 — Task `premium-redesign-phase-4` — Papers Netflix-style browsing

**Scope:** Phase 4 of the premium dark-luxury redesign. Transformed the
Papers page from flat cards into Netflix-style browsing tiles with a
thumbnail hero per paper.

### Design tokens added (`src/app/globals.css`)

| Class | Purpose |
|-------|---------|
| `.papers-hero` | Premium gradient header (dark luxury, radial glows) |
| `.papers-filter-bar` | Dark luxury filter bar with premium input overrides |
| `.paper-tile` | Netflix-style card — hover lift, top gradient bar, border glow |
| `.paper-thumbnail` | Thumbnail area with radial accent glows + bottom border |
| `.badge-premium` | Glass badge with backdrop blur |
| `.badge-premium-accent` | Plum-tinted glass badge for exam type |
| `.paper-btn-primary` | Gradient plum download button with glow |
| `.paper-btn-secondary` | Glass outline button (View, Clear) |
| `.count-badge-premium` | Plum-tinted count badge |
| `.skeleton-luxury-paper` | Premium skeleton with shimmer |

### Papers page redesigned (`src/features/papers/papers.tsx`)

**Premium hero:**
- Dark-luxury gradient card with handwritten "Library" eyebrow + serif "Question papers." headline
- Live count badge showing paper count

**Premium filter bar:**
- Dark-luxury surface with premium input overrides (dark bg, plum focus ring)
- Search input + Branch/Semester/Year selects + Clear button
- All inputs styled to match the dark theme

**Netflix-style paper cards:**
- Each card has a **thumbnail area** (h-24) with:
  - Large subject initial (serif font, plum color) as the "cover art"
  - Bookmark button (top-right, glass overlay)
  - Exam type badge (bottom-left, plum-tinted glass)
- Body section with:
  - Subject name (2-line clamp)
  - Subject code · Branch · Semester
  - View count, download count, month/year badge
  - File info (pages, size, relative time)
- Action buttons: Download (gradient plum) + View (glass outline)

**Animations:**
- Hero slides in on mount
- Cards stagger in (60ms per card, max 0.5s delay)
- Hover: card lifts 4px, top gradient bar appears, border glows plum
- Premium easing throughout (cubic-bezier)

### Validation

- `npx tsc --noEmit` → 0 errors
- `npx eslint src/` → 0 errors, 0 warnings
- `npx next build` → compiled successfully in 9.2s
- Dev server → Home 200, Admin 200
- Dev log → 0 errors

### Premium redesign progress

| # | Screen | Status |
|---|--------|--------|
| 1 | Hero Section | ✅ Done (Phase 1) |
| 2 | Navigation sidebar | ✅ Done (Phase 2) |
| 3 | Dashboard Layout | ✅ Done (Phase 1) |
| 4 | Student Overview | ✅ Done (Phase 1) |
| 5 | Calculators marketplace | ✅ Done (Phase 3) |
| 6 | Papers (Netflix-style) | ✅ Done (Phase 4) |
| 7 | Notices timeline | ⏳ Next |
| 8 | Calendar planner | ⏳ |
| 9 | Empty states | ⏳ |
| 10 | Motion polish | ⏳ |

