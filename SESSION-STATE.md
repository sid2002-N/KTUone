# KTU One — Session State (Persistent Memory)

> **Purpose:** This file survives sandbox resets because it lives in the
> GitHub repo (`sid2002-N/KTUone`), not in the ephemeral sandbox filesystem.
> If a reset wipes `/home/z/my-project/`, just `git clone` the repo and
> follow the **Recovery Checklist** below — every change made up to the
> last commit is preserved here.
>
> **Last updated:** 2026-07-13 (commit `b2c7bf5`)

---

## Current Commit

```
b2c7bf5 feat: replace ZAI icon with custom KTU One branded favicon
```

Branch: `main`
Remote: `https://github.com/sid2002-N/KTUone.git`

---

## What This Project Is

**KTU One** — academic companion app for APJ Abdul Kalam Technological
University students. Built with Next.js 16 App Router, TypeScript, Prisma +
Neon PostgreSQL, Cloudflare R2 (PDFs), Razorpay (payments), Upstash Redis
(rate limiting), JWT auth (httpOnly cookies).

Production URL: **https://ktuone.in** (deployed on Vercel)

---

## Recent Modifications (this session, newest first)

| Commit | What changed |
|--------|--------------|
| `b2c7bf5` | Replaced default ZAI favicon with a custom **KTU One branded icon** — amber "K" letterform with graduation-cap accent on charcoal background. Generated `favicon.svg`, `favicon.ico`, `favicon-16/32.png`, `apple-touch-icon.png` (180), `icon-192/512.png`. Updated `public/logo.svg` (header) to match. Updated `src/app/layout.tsx` icons metadata to prefer SVG. Added `scripts/make-ktu-favicon.py` for reproducible regeneration. |
| `905acab` | Initial favicon + apple-touch-icon (this was the ZAI default — superseded by `b2c7bf5`). |
| `254507f` | Cleanup pass — locked in the prior session's hydration fixes. |

---

## Full Feature Inventory (built across all sessions)

### Routes (8 pages, 7 SEO-indexed)

| Route | Purpose | Indexed |
|-------|---------|---------|
| `/` | Dashboard — greeting, quick links, hidden `<h1>` for SEO | yes |
| `/calculators` | SGPA / CGPA / attendance / tool marketplace | yes |
| `/question-papers` | Apple Files–style PDF browser (was `/papers`, 301-redirected) | yes |
| `/syllabus` | Syllabus PDF browser | yes |
| `/calendar` | Academic calendar with countdowns | yes |
| `/notices` | Notice timeline with priority dots (scraper-cleaned text) | yes |
| `/settings` | Apple-style grouped settings (theme, sync, supporter) | no (noindex) |
| `/admin` | Admin CRUD — papers, syllabus, notices, calendar | no (auth-gated) |

### API Routes (23 total)

- **Auth:** `/api/v1/login`, `/api/v1/refresh`, `/api/v1/logout`, `/api/v1/register`, `/api/v1/me`
- **Scrape:** `/api/v1/scrape` (KTU portal → grades, attendance, timetable)
- **Papers:** `/api/v1/papers` (list), `/api/v1/papers/[id]/download` (R2 signed URL)
- **Syllabus:** `/api/v1/syllabus` (list), `/api/v1/syllabus/[id]/download`
- **Notices:** `/api/v1/notices`
- **Calendar:** `/api/v1/calendar`
- **Payments:** `/api/v1/payments/create-order`, `/api/v1/payments/verify`, `/api/v1/payments/restore`
- **Admin:** `/api/v1/admin/*` (CRUD for papers, syllabus, notices, calendar) — Bearer API key auth
- **Upload:** `/api/v1/admin/papers/upload`, `/api/v1/admin/syllabus/upload` — R2 multipart

### SEO Infrastructure

- `src/app/sitemap.ts` — 6 routes (excludes `/settings` and `/admin`)
- `src/app/robots.ts` — allows all, disallows `/admin`, `/api/`, `/settings`
- JSON-LD on every page: `EducationalOrganization`, `WebApplication`, `CollectionPage`, `Course`
- `public/og-default.png` — 1200×630 branded OG image
- `public/manifest.webmanifest` — PWA manifest with theme_color `#111315`
- Canonical URLs via `metadataBase: https://ktuone.in`
- Google + Bing verification placeholders in `layout.tsx` (replace `XXXXXXX`)

### Design System (Liquid Glass)

- **Fonts:** Source Serif 4 (serif), Inter (sans), IBM Plex Mono (mono)
- **Dark palette:** bg `#111315`, primary amber `#D4943A`, accent `#22262A`
- **Light palette:** bg `#EDE8E0`, primary `#B8762E`, accent `#E4DDD2`
- **Effects:** `backdrop-filter`, inner highlights, soft shadows
- **Mobile:** bottom nav bar, safe-area insets, 44px touch targets
- **Hydration fixes:** theme script in `<body>` (not `<head>`), 4 stores with `skipHydration: true`, `StoreRehydrator` component, Framer Motion mount pattern

### Auth & Sessions

- JWT in httpOnly cookie `ktu_access` (HS256, 15-min access)
- Refresh token `ktu_refresh` (30-day, rotated on each refresh)
- `src/lib/providers/session-restore.tsx` — auto-login on app load via `/api/v1/refresh`
- `src/features/sync/sync-dialog.tsx` — manual re-sync button
- `src/store/auth-store.ts` — persists `lastSyncedAt` + `rememberedRegisterNumber` (skipHydration)

### Payments (Razorpay, test mode)

- `src/lib/payments/razorpay-server.ts` — order creation, HMAC-SHA256 signature verify
- `src/lib/providers/payment-razorpay.ts` — client-side checkout modal
- Supporter purchase: ₹99 (9900 paise)
- Webhook URL not yet configured in Razorpay dashboard (TODO)

### Ads System (4 modes)

- `src/lib/providers/ads.ts` — provider abstraction
- Modes: `banner` (custom in-app banner), `adsense` (Google AdSense), `admob` (AdMob via Capacitor), `none`
- Switch via `NEXT_PUBLIC_ADS_PROVIDER` env var
- AdSense application pending (needs real content first)

### Mobile (Capacitor)

- `src/lib/utils/haptics.ts` — unified vibration (Capacitor `@capacitor/haptics` + `navigator.vibrate` fallback)
- Safe-area insets via `viewport-fit=cover` + `env(safe-area-inset-*)`
- APK build guide in `guide.md`

### Data Integrity

- `src/lib/utils/clean-text.ts` — `cleanScraperText()` strips HTML entities + tags from scraped notices
- `src/lib/scraper/mapper.ts` — **credit-weighted CGPA**: `Σ(credits × SGPA) / Σ(credits)`, missing SGPA = 0
- `src/lib/scraper/index.ts` — `safeJsonParse` for defensive SSE parsing
- `scripts/cleanup-mock-data.ts` — purged 32 papers + 10 syllabi + 6 notices + 6 calendar events (mock seed)

### Stores (Zustand, all `skipHydration: true`)

- `src/store/auth-store.ts` — auth + remembered register number
- `src/store/supporter-store.ts` — supporter status
- `src/store/bookmark-store.ts` — paper/syllabus bookmarks
- `src/store/calc-history-store.ts` — calculator input history
- `src/store/nav-store.ts` — modal open/close states only (no SSR-sensitive data)

---

## Recovery Checklist (after sandbox reset)

If `/home/z/my-project/` is wiped, run these in order:

```bash
# 1. Clone the repo (preserves all source code + this file)
cd /home/z/my-project
git clone https://github.com/sid2002-N/KTUone.git .
# (if repo already exists: git pull origin main)

# 2. Install dependencies
npm install

# 3. Restore .env.local (sandbox wipes this — must rebuild every time)
#    Get values from your password manager / Vercel dashboard
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://...@neon.tech/ktuone
JWT_SECRET=<32+ char random string>
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=ktuone
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
KTU_ADMIN_KEY=<your admin bearer key>
ADMIN_ALLOWED_ORIGIN=https://ktuone.in
NEXT_PUBLIC_APP_URL=https://ktuone.in
NEXT_PUBLIC_ADS_PROVIDER=none
NEXT_PUBLIC_RAZORPAY_KEY_ID=...
EOF

# 4. Verify the upload routes exist (sandbox has wiped these before)
ls src/app/api/v1/admin/papers/upload/route.ts
ls src/app/api/v1/admin/syllabus/upload/route.ts
# If missing — restore from git: git checkout HEAD -- src/app/api/v1/admin/

# 5. Verify no stray public/robots.txt (sandbox has restored a stale one before)
ls public/robots.txt 2>/dev/null && rm public/robots.txt
# (Next.js generates /robots.txt dynamically from src/app/robots.ts)

# 6. Verify no stray src/proxy.ts OR src/middleware.ts conflict
#    (both have existed at different times — only ONE should be present)
ls src/middleware.ts src/proxy.ts 2>/dev/null
# Per Next.js 16: src/middleware.ts is the canonical path
# (the "middleware" file convention still works but logs a deprecation warning)

# 7. Generate Prisma client
npx prisma generate

# 8. Run the dev server
npm run dev
# Verify: http://localhost:3000 returns 200
# Verify: http://localhost:3000/favicon.svg returns 200 (custom KTU icon)
# Verify: http://localhost:3000/robots.txt returns 200 (dynamic)
# Verify: http://localhost:3000/sitemap.xml returns 200
```

---

## Files Most Likely to Be Wiped by Sandbox Reset

Based on observed patterns, the sandbox tends to restore old versions of:

| File | Symptom | Fix |
|------|---------|-----|
| `.env.local` | DB/auth/R2/payments all 500 | Rebuild from template above |
| `src/app/api/v1/admin/papers/upload/route.ts` | Admin paper upload 404 | `git checkout HEAD -- src/app/api/v1/admin/papers/upload/` |
| `src/app/api/v1/admin/syllabus/upload/route.ts` | Admin syllabus upload 404 | `git checkout HEAD -- src/app/api/v1/admin/syllabus/upload/` |
| `public/robots.txt` | Stale static file shadows dynamic `src/app/robots.ts` | `rm public/robots.txt` (and add to `.gitignore`) |
| `src/proxy.ts` | Conflicts with `src/middleware.ts` | `rm src/proxy.ts` if it appears |

All of these are committed to GitHub, so `git checkout HEAD -- <path>`
restores them.

---

## Outstanding TODOs (not yet done)

1. **Deploy to Vercel** — `ktuone.in` is still running old code without the scraper-text cleanup. A new deployment will permanently fix the dirty-notice issue.
2. **Google Search Console verification** — replace `public/google-XXXXXXX.html` with the real verification file (or replace `XXXXXXX` in `layout.tsx` `verification.google`).
3. **Bing Webmaster verification** — replace `XXXXXXX` in `verification.other["msvalidate.01"]`.
4. **Razorpay production webhook** — set webhook URL to `https://ktuone.in/api/v1/payments/webhook` (route not yet implemented; needed only for production-grade idempotency).
5. **Add real content via `/admin`** — papers, notices, syllabus, calendar events (currently DB has the cleanup remnants only).
6. **AdSense application** — apply after content is live.
7. **Capacitor APK build** — follow `guide.md` section "Hybrid Capacitor APK" for offline-persistent Android build.

---

## Key File Map (quick reference)

```
src/
├── app/
│   ├── layout.tsx              # Root layout, fonts, theme script, metadata
│   ├── page.tsx                # Dashboard (/)
│   ├── calculators/page.tsx    # /calculators
│   ├── question-papers/page.tsx# /question-papers (was /papers)
│   ├── syllabus/page.tsx       # /syllabus
│   ├── calendar/page.tsx       # /calendar
│   ├── notices/page.tsx        # /notices
│   ├── settings/page.tsx       # /settings (noindex)
│   ├── admin/                  # /admin (auth-gated)
│   ├── sitemap.ts              # Dynamic sitemap
│   ├── robots.ts               # Dynamic robots.txt
│   └── api/v1/                 # 23 API routes (see above)
├── components/layout/app-shell.tsx  # Top nav + mobile bottom nav
├── features/
│   ├── dashboard/dashboard.tsx
│   ├── calculators/calculators.tsx
│   ├── papers/papers.tsx
│   ├── notices/notices.tsx
│   ├── calendar/calendar.tsx
│   ├── settings/settings.tsx
│   ├── sync/sync-dialog.tsx
│   ├── login/login-dialog.tsx
│   └── search/search-overlay.tsx
├── lib/
│   ├── providers/
│   │   ├── index.tsx           # StoreRehydrator
│   │   ├── session-restore.tsx # Auto-login on load
│   │   ├── ads.ts              # 4-mode ad system
│   │   ├── authed-fetch.ts     # 401 → refresh → retry
│   │   └── payment-razorpay.ts # Razorpay checkout
│   ├── scraper/
│   │   ├── index.ts            # KTU portal scraper
│   │   └── mapper.ts           # Credit-weighted CGPA
│   ├── auth/
│   │   ├── index.ts            # JWT sign/verify
│   │   ├── ratelimit.ts        # Upstash rate limits
│   │   └── admin-cors.ts       # Admin CORS
│   ├── storage/r2.ts           # Cloudflare R2 helper
│   ├── payments/razorpay-server.ts
│   └── utils/
│       ├── haptics.ts          # Capacitor + navigator.vibrate
│       └── clean-text.ts       # HTML entity/tag stripper
├── store/
│   ├── auth-store.ts           # skipHydration
│   ├── supporter-store.ts      # skipHydration
│   ├── bookmark-store.ts       # skipHydration
│   ├── calc-history-store.ts   # skipHydration
│   └── nav-store.ts            # modal state only
└── middleware.ts               # /api/v1/* route protection

public/
├── favicon.svg                 # ← NEW custom KTU icon
├── favicon.ico
├── favicon-16.png / favicon-32.png
├── apple-touch-icon.png (180)
├── icon-192.png / icon-512.png
├── logo.svg                    # header logo (matches favicon)
├── og-default.png              # 1200×630 OG image
├── manifest.webmanifest
└── google-XXXXXXX.html         # placeholder (replace with real)

scripts/
├── make-ktu-favicon.py         # regenerate favicon set
└── cleanup-mock-data.ts        # one-shot mock purger

guide.md                        # hosting + Capacitor APK guide
README.md                       # project documentation
worklog.md                      # task-level work log (append-only)
SESSION-STATE.md                # ← THIS FILE (persistent memory)
```

---

## How to Regenerate the Favicon

If the favicon ever needs adjustment (color, shape, etc.):

```bash
# Edit the SVG template inside scripts/make-ktu-favicon.py
# Then regenerate all sizes:
python3 /home/z/my-project/scripts/make-ktu-favicon.py
# Outputs: favicon.svg, favicon.ico, favicon-16/32.png,
#          apple-touch-icon.png, icon-192/512.png, logo.svg
```

Design tokens used:
- Background: deep charcoal gradient `#1A1D20` → `#0E1012`
- Letterform: amber gradient `#E8A84D` → `#B8762E`
- Rounded square: 480×480 with `rx=112` on a 512×512 viewBox
- Accent: graduation cap (mortarboard + tassel) in solid `#D4943A`
