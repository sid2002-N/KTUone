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

