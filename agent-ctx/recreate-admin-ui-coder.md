# Task `recreate-admin-ui` — Agent work record

**Agent:** coder
**Scope:** Recreate the KTU One admin UI (8 client components) and wire the
Razorpay payment provider.

## Files created / modified

| # | Path | Action |
|---|------|--------|
| 1 | `src/app/admin/page.tsx` | created |
| 2 | `src/features/admin/admin-login.tsx` | created |
| 3 | `src/features/admin/admin-dashboard.tsx` | created |
| 4 | `src/features/admin/notices-admin.tsx` | created |
| 5 | `src/features/admin/calendar-admin.tsx` | created |
| 6 | `src/features/admin/papers-admin.tsx` | created |
| 7 | `src/features/admin/syllabus-admin.tsx` | created |
| 8 | `src/features/admin/timetables-admin.tsx` | created |
| 9 | `src/lib/providers/index.tsx` | modified — wired `RazorpayPaymentProvider` |

## Design notes

- All admin components are `"use client"` because they call `fetch` with a
  user-supplied Bearer key and use local React state for forms + lists.
- The admin API key lives only in `useState` on the `/admin` route — no
  localStorage, so reload signs the admin out.
- Auth header pattern is uniform:
  `{ headers: { Authorization: \`Bearer ${adminKey}\`, ... } }`.
- Forms use `grid grid-cols-1 sm:grid-cols-2 gap-3`.
- Lists use `max-h-96 overflow-y-auto` with `space-y-2`.
- Delete actions use `confirm()` before the DELETE request.
- Loading + error states are inline (Lucide `Loader2` spinner + red
  `AlertCircle` boxes).
- Used shadcn/ui primitives throughout: `Card`, `Button`, `Input`,
  `Textarea`, `Label`, `Select`, `Checkbox`, `Badge`.

## API contract notes (gotchas for future agents)

- `POST /api/v1/admin/papers/upload` and `/api/v1/admin/syllabus/upload` use
  `multipart/form-data`. The client MUST NOT set `Content-Type` — the browser
  sets the multipart boundary. Only the `Authorization` header is added.
- `POST /api/v1/admin/timetables` requires `fileUrl` per the existing
  `TimetableInputSchema`. The admin UI exposes richer fields (`examType`,
  `academicYear`, dynamic entry rows) — these are included in the POST body
  for forward-compatibility but are currently ignored by the server's Zod
  parse (zod strips unknown keys). A deterministic placeholder `fileUrl`
  (`admin-timetable-<ts>-<slug>`) is synthesized so the schema validates.
- Soft-deleted papers/syllabus/notices are returned by the admin list
  endpoints; the UI shows a "deleted" badge for them.
- The download test links (`/api/v1/papers/<id>/download` and
  `/api/v1/syllabus/<id>/download`) go through the public student download
  routes which perform their own `getAuthenticatedStudent` auth — opening them
  in the admin panel without a student session will return 401. That's
  expected; the link is just a convenience for verifying the R2 object key.

## Razorpay wiring

`src/lib/providers/index.tsx`'s `WireStudentService` now also calls
`__setPaymentProvider(new RazorpayPaymentProvider())` in its `useEffect`. The
default `MockPaymentProvider` is replaced at app boot. The
`RazorpayPaymentProvider.initiatePurchase` flow is:
1. `POST /api/v1/payments/create-order` via `authedFetch`
2. Load `https://checkout.razorpay.com/v1/checkout.js`
3. Open the Razorpay modal
4. `POST /api/v1/payments/verify` with the returned signature

## Validation

- `bun run lint` → **clean** (0 errors, 0 warnings) after removing 5
  unused `eslint-disable-next-line react-hooks/exhaustive-deps` directives
  that the rule wasn't actually triggering on.
- Dev server:
  - `GET /admin` → 200 (compile 732ms, render 61ms) — first hit
  - `GET /admin` → 200 (compile 2ms, render 31ms) — cached
  - `GET /` → 200 — home route still works after the providers change
- HTML contains "KTU One Admin", "Admin API Key", "Sign in" — confirming the
  login card renders server-side.

## What the user should do next

1. Open the Preview Panel and navigate to `/admin` (the route is not linked
   from the main app shell — it's a separate origin conceptually, even though
   it's served from the same Next.js app in this dev sandbox).
2. Enter the `ADMIN_API_KEY` env var value into the password field.
3. Once logged in, the 5 tabs (Notices / Calendar / Papers / Syllabus /
   Timetables) are functional CRUD interfaces against the admin API.
