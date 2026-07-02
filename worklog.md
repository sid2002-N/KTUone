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

