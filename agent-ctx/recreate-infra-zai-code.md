# Work Record — Task `recreate-infra`

**Agent:** Z.ai Code (code agent)
**Date:** 2025
**Task:** Recreate 7 lost infrastructure files for KTU One Next.js 16 app.

## What was done

Created 7 files exactly as specified by the orchestrator:

1. `src/lib/storage/r2.ts` — Cloudflare R2 helper using
   `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. Exports
   `uploadToR2`, `getSignedDownloadUrl`, `deleteFromR2`, `buildPaperKey`,
   `buildSyllabusKey`. S3Client configured with `region: "auto"` and the R2
   endpoint `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`.
2. `src/lib/payments/razorpay-server.ts` — Razorpay server helper. Exports
   `createOrder` (9900 paise = ₹99, creates `Pending` SupporterPurchase),
   `verifyPaymentSignature` (HMAC-SHA256 with timing-safe compare),
   `markPurchaseSuccess`, `checkSupporterStatus`. Uses `razorpay` npm
   package, `crypto`, `db` from `@/lib/db`.
3. `src/lib/providers/authed-fetch.ts` — Client-side `authedFetch` with
   401 → refresh → retry-once. Refresh calls deduplicated via a
   module-scoped `_refreshing` promise.
4. `src/lib/providers/payment-razorpay.ts` — Client-side
   `RazorpayPaymentProvider` implementing the `PaymentProvider` interface.
   Loads `https://checkout.razorpay.com/v1/checkout.js`, opens the modal,
   calls `/api/v1/payments/create-order` and `/api/v1/payments/verify` via
   `authedFetch`. Declares `window.Razorpay` globally.
5. `src/lib/auth/ratelimit.ts` — Upstash-backed rate limits:
   `checkLoginRateLimit` (5 / 15 min), `checkRefreshRateLimit` (30 / hour),
   `getRequestIp`. Graceful no-op when `UPSTASH_REDIS_REST_URL` is unset.
6. `src/lib/auth/admin-cors.ts` — `getAdminCorsHeaders`,
   `adminJsonResponse`, `handleAdminOptions`. Production allow-list via
   `ADMIN_ALLOWED_ORIGIN`; dev uses `*`.
7. `src/middleware.ts` — Defense-in-depth `/api/v1/*` route protection.
   Allows public auth routes, admin routes, and download routes (handlers
   do their own auth). All other routes require a valid `ktu_access` JWT
   cookie verified with `jose` (edge-runtime compatible).

## Files read for context

- `src/lib/db.ts` — Prisma client singleton.
- `src/lib/auth/index.ts` — existing JWT helpers, cookie names
  (`ktu_access`, `ktu_refresh`), `getAuthenticatedStudent`.
- `src/lib/types/index.ts` — `PaymentProvider`, `SupporterPurchase`,
  `PaymentStatus` types.
- `src/lib/providers/payment.ts` — `PaymentProvider` interface,
  `InitiatePurchaseInput`, `InitiatePurchaseResult`.
- `src/lib/providers/student-http.ts` — existing private `authedFetch`
  pattern reference.
- `prisma/schema.prisma` — `SupporterPurchase` model fields.
- `package.json` — confirmed all required packages are installed:
  `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@upstash/ratelimit`,
  `@upstash/redis`, `razorpay`, `jose`.
- `src/app/api/v1/login/route.ts` — imports
  `{ checkLoginRateLimit, getRequestIp }` from `@/lib/auth/ratelimit`.
- `src/app/api/v1/refresh/route.ts` — imports
  `{ checkRefreshRateLimit, getRequestIp }` from `@/lib/auth/ratelimit`.
- `src/app/api/v1/papers/[id]/download/route.ts` and
  `src/app/api/v1/syllabus/[id]/download/route.ts` — both import
  `getSignedDownloadUrl` from `@/lib/storage/r2`.
- `.env.example` — confirmed env var names match.

## Validation

- `bun run lint` → **clean**, no errors, no warnings.
- Dev server log shows the new `middleware.ts` was picked up by Next.js
  without compile errors. The "middleware convention is deprecated, use
  proxy instead" notice is informational only and does not break anything;
  the task spec explicitly required `src/middleware.ts`.

## Followups for other agents

- The BFF route handlers `/api/v1/payments/create-order`,
  `/api/v1/payments/verify`, `/api/v1/payments/restore` are referenced by
  `payment-razorpay.ts` but are NOT part of this task. A future agent should
  create them — they should call into `src/lib/payments/razorpay-server.ts`.
- Admin route handlers under `/api/v1/admin/*` are not part of this task
  either; they should use `getAdminCorsHeaders` / `adminJsonResponse` /
  `handleAdminOptions` from `src/lib/auth/admin-cors.ts` and verify
  `Authorization: Bearer <ADMIN_API_KEY>`.
