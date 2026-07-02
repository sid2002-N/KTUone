# KTU One — Complete Deployment & Operations Guide

> **Read this before doing anything.** This guide walks you through every service, every env var, every admin operation, and every deployment step. Follow it top-to-bottom the first time.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [🚨 Critical Security Fix — Do This First](#2-🚨-critical-security-fix--do-this-first)
3. [Architecture at a Glance](#3-architecture-at-a-glance)
4. [Services You Need Accounts On](#4-services-you-need-accounts-on)
5. [Environment Variables — Complete Reference](#5-environment-variables--complete-reference)
6. [Local Development Setup](#6-local-development-setup)
7. [Database Setup (Neon PostgreSQL)](#7-database-setup-neon-postgresql)
8. [Scraper Backend (Railway)](#8-scraper-backend-railway)
9. [Cloudflare R2 (PDF Storage)](#9-cloudflare-r2-pdf-storage)
10. [Razorpay (Payments)](#10-razorpay-payments)
11. [Upstash Redis (Rate Limiting)](#11-upstash-redis-rate-limiting)
12. [Admin Panel — Adding Content](#12-admin-panel--adding-content)
13. [Student-Facing Features](#13-student-facing-features)
14. [Deployment to Vercel](#14-deployment-to-vercel)
15. [Cron Jobs (Auto-Sync Notices)](#15-cron-jobs-auto-sync-notices)
16. [Ads — AdSense & AdMob Activation](#16-ads--adsense--admob-activation)
17. [Mobile App (Capacitor) — Optional](#17-mobile-app-capacitor--optional)
18. [Post-Deployment Checklist](#18-post-deployment-checklist)
19. [Maintenance & Troubleshooting](#19-maintenance--troubleshooting)
20. [Credential Rotation](#20-credential-rotation)

---

## 1. Project Overview

**KTU One** is an academic companion app for APJ Abdul Kalam Technological University students. It provides:

- **Dashboard** — CGPA, attendance, recent activity, upcoming events
- **Calculators** — SGPA, CGPA, attendance, internal marks, pass calculator
- **Question Papers** — browse, filter, download (PDF from R2)
- **Syllabus** — browse, download per subject
- **Notices** — university notices, synced from scraper + admin-added
- **Calendar** — academic events + exam timetables
- **Bookmarks** — save papers/syllabus (DB when logged in, localStorage otherwise)
- **Search** — universal search across papers, syllabus, notices, calendar, subjects
- **Supporter** — ₹99 lifetime ad-free via Razorpay

**Tech stack**: Next.js 16, TypeScript, Prisma, Neon PostgreSQL, Cloudflare R2, Razorpay, Upstash Redis, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, Framer Motion.

---

## 2. 🚨 Critical Security Fix — Do This First

> **Your `download/keys.md` file was previously committed to GitHub with all real credentials.** Anyone with access to your repo can see them. You MUST rotate every credential before deploying.

### What was leaked (if you pushed before this fix)

Check your repo: `https://github.com/sid2002-N/aiapplication/blob/main/download/keys.md`

If the file is there, **all of these are compromised and must be rotated**:

| Credential | Where to rotate | Section in this guide |
|-----------|-----------------|----------------------|
| Neon DB password | Neon dashboard → Connect → reset password | [§7](#7-database-setup-neon-postgresql) |
| Scraper API key | Railway scraper env vars | [§8](#8-scraper-backend-railway) |
| JWT secret | Generate new 64-byte hex | [§5](#5-environment-variables--complete-reference) |
| Admin API key | Generate new 64-byte hex | [§5](#5-environment-variables--complete-reference) |
| Cron secret | Generate new 32-byte hex | [§5](#5-environment-variables--complete-reference) |
| R2 access keys | Cloudflare R2 → API tokens → regenerate | [§9](#9-cloudflare-r2-pdf-storage) |
| Razorpay key secret | Razorpay dashboard → API keys → regenerate | [§10](#10-razorpay-payments) |
| Razorpay webhook secret | Razorpay webhooks → regenerate | [§10](#10-razorpay-payments) |

### What I've already done

- ✅ Added `download/keys.md` and `download/*.md` to `.gitignore`
- ✅ Ran `git rm --cached download/keys.md` (file removed from git tracking, still on disk)
- ✅ The next `git commit` + `git push` will remove it from GitHub

### What you must do

1. **Rotate every credential listed above** (follow each section in this guide).
2. Update `download/keys.md` locally with the new values (it's now gitignored — safe).
3. Update `.env.local` locally with the new values.
4. Commit the `.gitignore` change:
   ```bash
   git add .gitignore
   git commit -m "chore: stop tracking credentials, add to .gitignore"
   git push
   ```
5. **Even after removing it from the repo, GitHub keeps history.** The credentials are still in old commits. The only fully-secure option is to rotate them (step 1) — which is why rotation is mandatory, not optional.

---

## 3. Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Next.js hosting)                  │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │  Student UI  │   │  Admin UI    │   │  API Routes  │    │
│  │  (7 screens) │   │  (/admin)    │   │  (/api/v1/*) │    │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘    │
│         │                  │                   │             │
│         └──────────────────┴───────────────────┘             │
│                             │                                │
│                    ┌────────▼────────┐                       │
│                    │   Prisma ORM    │                       │
│                    └────────┬────────┘                       │
└─────────────────────────────┼────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │  Neon DB    │  │ Cloudflare  │  │  Upstash    │
    │ (PostgreSQL)│  │  R2 (PDFs)  │  │  Redis      │
    │             │  │             │  │ (rate limit)│
    └─────────────┘  └─────────────┘  └─────────────┘
                              ▲
                              │
                    ┌─────────┴─────────┐
                    │  Railway scraper  │
                    │  (KTU portal API) │
                    └───────────────────┘
                              ▲
                              │
                    ┌─────────┴─────────┐
                    │  Razorpay         │
                    │  (₹99 payments)   │
                    └───────────────────┘
```

**Data flow for a student login**:
1. Student enters KTU register number + password on the login dialog.
2. BFF `/api/v1/login` (rate-limited) calls the Railway scraper with credentials.
3. Scraper logs into `app.ktu.edu.in`, fetches student profile + results + CGPA.
4. BFF creates a `Student` row in Neon DB, caches scraper response in `CachedStudentData` (24h TTL).
5. BFF issues JWT access token (1h, in httpOnly cookie) + refresh token (30d, hashed in DB).
6. Student UI hydrates with real data via TanStack Query + Server Actions.

---

## 4. Services You Need Accounts On

| Service | Purpose | Free tier? | Action |
|---------|---------|-----------|--------|
| **GitHub** | Code hosting | ✅ | Already have (`sid2002-N/aiapplication`) |
| **Vercel** | Next.js hosting | ✅ Hobby tier | [Sign up](https://vercel.com) with GitHub |
| **Neon** | PostgreSQL database | ✅ 0.5GB free | [Sign up](https://neon.tech) |
| **Cloudflare** | R2 object storage (PDFs) | ✅ 10GB free | [Sign up](https://cloudflare.com) |
| **Railway** | Scraper backend hosting | ⚠️ $5/mo after trial | Already deployed |
| **Razorpay** | ₹99 supporter payments | ✅ Test mode free | [Sign up](https://razorpay.com) |
| **Upstash** | Redis (rate limiting) | ✅ 10k req/day free | [Sign up](https://upstash.com) |
| **Google AdSense** | Web ads (activate later) | ✅ | [Apply](https://adsense.google.com) after deploy |
| **Google AdMob** | Mobile ads (activate later) | ✅ | [Sign up](https://admob.google.com) when building mobile |

> **You already have credentials for all of these** in `download/keys.md`. The sections below explain what each does and how to rotate/verify them.

---

## 5. Environment Variables — Complete Reference

All env vars live in `.env.local` (local dev) and must be set in the Vercel dashboard (production). The template is `.env.example`.

### Database (Neon PostgreSQL)

| Var | Purpose | Example |
|-----|---------|---------|
| `DATABASE_URL` | Connection string (pooled, for app queries) | `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require` |
| `DIRECT_URL` | Connection string (direct, for Prisma migrations) | `postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require` |

> **Note**: `DATABASE_URL` uses the **pooler** endpoint (`-pooler` in hostname) for connection pooling. `DIRECT_URL` uses the **direct** endpoint for migrations. Both come from the Neon dashboard → Connect → Connection string.

### Scraper Backend (Railway)

| Var | Purpose |
|-----|---------|
| `SCRAPER_API_URL` | Base URL of your Railway-deployed scraper (e.g. `https://ktugatewayapi-production.up.railway.app`) |
| `SCRAPER_API_KEY` | Bearer key the scraper expects in `Authorization` header |

### JWT Authentication

| Var | Purpose | How to generate |
|-----|---------|-----------------|
| `JWT_SECRET` | Signs access + refresh tokens | `openssl rand -hex 64` |
| `JWT_ACCESS_TTL` | Access token lifetime (seconds) | `3600` (1 hour) |
| `JWT_REFRESH_TTL` | Refresh token lifetime (seconds) | `2592000` (30 days) |

### Cache

| Var | Purpose |
|-----|---------|
| `CACHE_TTL_SECONDS` | How long scraper responses stay cached in `CachedStudentData` | `86400` (24 hours) |

### Admin & Cron

| Var | Purpose | How to generate |
|-----|---------|-----------------|
| `ADMIN_API_KEY` | Bearer key for `/api/v1/admin/*` routes | `openssl rand -hex 32` |
| `CRON_SECRET` | Bearer key for `/api/cron/sync-notifications` | `openssl rand -hex 32` |

### Cloudflare R2 (PDF Storage)

| Var | Purpose |
|-----|---------|
| `R2_ACCOUNT_ID` | Cloudflare account ID (dashboard right sidebar) |
| `R2_ACCESS_KEY_ID` | R2 API token → access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API token → secret access key |
| `R2_BUCKET_NAME` | R2 bucket name (e.g. `ktu1`) |

### Razorpay (Payments)

| Var | Purpose |
|-----|---------|
| `RAZORPAY_KEY_ID` | API key ID (test: `rzp_test_…`, live: `rzp_live_…`) |
| `RAZORPAY_KEY_SECRET` | API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature secret (set in Razorpay dashboard → Webhooks) |

### Upstash Redis (Rate Limiting)

| Var | Purpose |
|-----|---------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

> If these are unset, rate limiting silently no-ops (dev mode). **Set them for production.**

### Admin CORS

| Var | Purpose |
|-----|---------|
| `ADMIN_ALLOWED_ORIGIN` | Allowed origin for admin CORS (e.g. `https://admin.ktuone.in`). Dev uses `*`. |

### Ads (NEXT_PUBLIC_* — visible to client)

| Var | Default | Purpose |
|-----|---------|---------|
| `NEXT_PUBLIC_ADS_PROVIDER` | `banner` | `banner` \| `adsense` \| `admob` \| `none` |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | _(empty)_ | `ca-pub-XXXXXXXXXXXXXXXX` |
| `NEXT_PUBLIC_ADSENSE_SLOTS` | `{}` | JSON map of slot → AdSense slot ID |
| `NEXT_PUBLIC_ADSENSE_FORMAT` | `auto` | `auto` \| `horizontal` \| `vertical` \| `rectangle` |
| `NEXT_PUBLIC_ADSENSE_RESPONSIVE` | `true` | `true` \| `false` |
| `NEXT_PUBLIC_ADMOB_APP_ID` | _(empty)_ | `ca-app-pub-XXXX~XXXX` |
| `NEXT_PUBLIC_ADMOB_BANNER_ID` | _(empty)_ | `ca-app-pub-XXXX/XXXX` |
| `NEXT_PUBLIC_ADMOB_SLOTS` | `{}` | JSON map of slot → ad unit ID |
| `NEXT_PUBLIC_ADMOB_BANNER_SIZE` | `SMART_BANNER` | `BANNER` \| `LARGE_BANNER` \| `MEDIUM_RECTANGLE` \| `FULL_BANNER` \| `LEADERBOARD` \| `SMART_BANNER` |
| `NEXT_PUBLIC_ADMOB_POSITION` | `BOTTOM_CENTER` | `TOP_CENTER` \| `BOTTOM_CENTER` |
| `NEXT_PUBLIC_ADMOB_ACTIVE_SLOTS` | `["home-top"]` | JSON array of active slots |

> **Leave ads vars at defaults until Google approves your accounts.** See [§16](#16-ads--adsense--admob-activation).

---

## 6. Local Development Setup

```bash
# 1. Clone the repo
git clone https://github.com/sid2002-N/aiapplication.git
cd aiapplication

# 2. Install dependencies
npm install
# or: bun install

# 3. Copy env template and fill in real values
cp .env.example .env.local
# Edit .env.local — paste values from download/keys.md

# 4. Generate Prisma client
npm run db:generate

# 5. Push schema to Neon (creates tables)
npm run db:push

# 6. Seed reference data (branches + semesters only — no mock content)
npm run db:seed

# 7. Start dev server
npm run dev
# → http://localhost:3000
```

### ⚠️ Known dev gotcha: stale shell env var

If your shell exports a stale `DATABASE_URL=file:...` (from an old SQLite phase), it overrides `.env.local` because Next.js's dotenv loader doesn't overwrite existing `process.env` values. Use the wrapper script:

```bash
./scripts/dev-start.sh
```

This unsets `DATABASE_URL` + `DIRECT_URL` before launching `next dev`, so `.env.local` takes effect. **Not an issue on Vercel** (env vars set in dashboard, no shell inheritance).

---

## 7. Database Setup (Neon PostgreSQL)

### If rotating credentials (recommended — see [§2](#2-🚨-critical-security-fix--do-this-first))

1. Go to [Neon dashboard](https://console.neon.tech) → your project.
2. **Settings → Connection Details → Reset password**.
3. Copy the new password.
4. **Connect → Connection string** — copy both:
   - **Pooled connection** (has `-pooler` in hostname) → `DATABASE_URL`
   - **Direct connection** → `DIRECT_URL`
5. Update `.env.local` + `download/keys.md` + Vercel env vars.

### Verifying the connection

```bash
# After updating .env.local:
npm run db:generate
npm run db:push   # should print "🚀 Your database is now in sync with your schema"
npm run db:seed   # should print "✅ Seed complete"
```

### Useful Prisma commands

```bash
npm run db:generate   # regenerate client after schema changes
npm run db:push       # push schema changes to DB (dev — no migration history)
npm run db:migrate    # create + apply migration (prod-safe)
npm run db:reset      # ⚠️ DROP ALL DATA + reseed (dev only!)
npm run db:seed       # seed reference data (branches, semesters)
```

### 15 models in the schema

`Branch`, `Semester`, `Subject`, `QuestionPaper`, `Syllabus`, `KTUNotice`, `CalendarEvent`, `Timetable`, `Student`, `CachedStudentData`, `RefreshToken`, `Bookmark`, `CalculatorHistoryEntry`, `SupporterPurchase`, `AppSettings`.

---

## 8. Scraper Backend (Railway)

The scraper is a separate Node.js service that logs into `app.ktu.edu.in` on behalf of students and returns structured JSON (profile, results, CGPA, attendance).

### Already deployed at

`https://ktugatewayapi-production.up.railway.app`

### If rotating `SCRAPER_API_KEY`

1. Go to [Railway dashboard](https://railway.app) → your scraper project.
2. Open the scraper service → **Variables** tab.
3. Generate a new `API_KEY` value: `openssl rand -hex 32`.
4. Update the variable. Railway redeploys automatically.
5. Update `.env.local` + `download/keys.md` + Vercel env vars with the new key.

### Endpoints the BFF calls

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/login` | Login with KTU credentials → student profile + results |
| `GET /api/v1/notifications` | Fetch latest KTU notices (called by cron) |

### Verifying the scraper is up

```bash
curl https://ktugatewayapi-production.up.railway.app/health
# Should return 200 OK
```

If down, students can't log in. The BFF returns `SCRAPER_UNAVAILABLE` (502) which the login dialog shows as "Our backend couldn't be reached."

---

## 9. Cloudflare R2 (PDF Storage)

R2 stores question paper PDFs and syllabus PDFs. Uploads go through the admin panel; downloads go through signed URLs (2-minute expiry) that require student auth.

### Bucket

`ktu1` (private — no public access; all downloads go through signed URLs).

### If rotating R2 credentials

1. Go to [Cloudflare dashboard](https://dash.cloudflare.com) → **R2 Object Storage**.
2. **Manage R2 API tokens** → delete the old token → create new.
3. Grant permissions: **Object Read & Write** on bucket `ktu1`.
4. Copy:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
   - **Account ID** (dashboard right sidebar) → `R2_ACCOUNT_ID`
5. Update `.env.local` + `download/keys.md` + Vercel env vars.

### How PDFs are stored

- **Papers**: `papers/<branchCode>/<year>/<month>/<subjectCode>-<timestamp>.pdf`
- **Syllabus**: `syllabus/<subjectCode>-<timestamp>.pdf`

The `fileUrl` column in the DB stores the R2 object key (not a public URL). Downloads go through `/api/v1/papers/[id]/download` → auth check → `getSignedDownloadUrl(key)` → 302 redirect to a 2-minute signed URL.

### If a PDF fails to load

1. Check the object exists in R2 (Cloudflare dashboard → R2 → bucket `ktu1`).
2. Check the student is authenticated (download route returns 401 without auth).
3. Check `R2_SECRET_ACCESS_KEY` is correct (regenerate if unsure).

---

## 10. Razorpay (Payments)

The supporter flow: ₹99 lifetime ad-free. Test mode works end-to-end without real money.

### Test vs Live mode

- **Test mode** (current): `rzp_test_…` keys. Use [test cards](https://razorpay.com/docs/payments/cards/test-cards/) like `4111 1111 1111 1111`, any future expiry, any CVV.
- **Live mode**: `rzp_live_…` keys. Real money. Switch when ready to launch.

### If rotating credentials

1. Go to [Razorpay dashboard](https://dashboard.razorpay.com) → **Settings → API Keys**.
2. **Generate New Key** → copy Key ID + Secret.
3. Update `.env.local` + `download/keys.md` + Vercel env vars.
4. **Settings → Webhooks** → edit your webhook → regenerate secret → update `RAZORPAY_WEBHOOK_SECRET`.

### Webhook setup (for production)

1. Razorpay dashboard → **Settings → Webhooks → Add New Webhook**.
2. **Webhook URL**: `https://your-vercel-domain.vercel.app/api/webhooks/razorpay`
3. **Events**: `payment.captured`, `payment.failed`
4. **Secret**: same as `RAZORPAY_WEBHOOK_SECRET`.
5. Save.

### Payment flow

```
Student clicks "Become a Supporter"
  ↓
RazorpayPaymentProvider.initiatePurchase()
  ↓ POST /api/v1/payments/create-order
  ↓ (server creates Razorpay order + Pending SupporterPurchase row)
  ↓
Razorpay checkout modal opens
  ↓ Student pays
  ↓
POST /api/v1/payments/verify
  ↓ (server verifies HMAC-SHA256 signature, timing-safe compare)
  ↓ SupporterPurchase.status → "Success"
  ↓
Student sees "Ad-free experience 💜"
```

### Switching from test to live

1. In Razorpay dashboard: **Account → Dashboard → switch to Live mode**.
2. Generate live API keys.
3. Update Vercel env vars: `RAZORPAY_KEY_ID=rzp_live_…`, `RAZORPAY_KEY_SECRET=…`.
4. Update webhook secret if different.
5. Redeploy.

---

## 11. Upstash Redis (Rate Limiting)

Without rate limiting, attackers can brute-force login passwords. Upstash provides serverless Redis with a REST API (no persistent connections needed).

### Limits enforced

| Route | Limit | Window |
|-------|-------|--------|
| `POST /api/v1/login` | 5 attempts | 15 minutes per IP |
| `POST /api/v1/refresh` | 30 attempts | 1 hour per IP |

### If `UPSTASH_REDIS_REST_URL` is unset

Rate limiting silently no-ops (returns `success: true`). This is fine for local dev but **must be set in production**.

### Setup

1. Go to [Upstash console](https://console.upstash.com) → **Create Database**.
2. Name it `ktu-one-ratelimit`, pick a region close to Vercel (e.g. `us-east-1`).
3. Copy:
   - **REST URL** → `UPSTASH_REDIS_REST_URL`
   - **REST Token** → `UPSTASH_REDIS_REST_TOKEN`
4. Update `.env.local` + Vercel env vars.

### Verifying

The login route logs rate-limit decisions to the dev console. Hit `/api/v1/login` 6 times rapidly from the same IP — the 6th should return 429 with `RATE_LIMITED`.

---

## 12. Admin Panel — Adding Content

The admin panel lives at **`/admin`** and is protected by `ADMIN_API_KEY` (Bearer auth). It's intentionally not linked from the student app — treat it as a separate surface.

### Logging in

1. Go to `https://your-domain.vercel.app/admin`.
2. Paste your `ADMIN_API_KEY` (from `.env.local` / `download/keys.md`).
3. Click **Sign in**.

The key lives in `useState` only — reload signs you out. (Future: `sessionStorage` for tab-scoped persistence.)

### 5 tabs

#### 📌 Notices

- **Create**: title, description, category (Academic/Examination/Scholarship/Placement/Cultural/General), priority (Pinned/High/Normal/Low), external URL, tags (comma-separated), pin checkbox.
- **List**: scrollable, shows all notices including soft-deleted (badge).
- **Delete**: soft-deletes (sets `deletedAt`) — disappears from student feed, kept for audit.

**Best practice**: Pin 1–2 critical notices (exam timetables, deadlines). Don't over-pin — students learn to ignore a permanently-pinned feed.

#### 📅 Calendar

- **Create**: title, description, type (EXAM/HOLIDAY/RESULT/REGISTRATION/WORKSHOP/DEADLINE/EVENT), start/end dates (`datetime-local`), color.
- **Delete**: hard-deletes (calendar events are point-in-time, no audit need).

**Best practice**: Add events 2–4 weeks ahead. The dashboard "Upcoming" widget shows the next one automatically.

#### 📄 Papers

- **Upload**: PDF file + metadata (title, subject code/name, semester, branch, year, month, exam type).
- **List**: shows all papers including soft-deleted.
- **Delete**: soft-deletes DB row + best-effort R2 delete (removes the actual PDF from storage to save space).
- **Test download**: opens `/api/v1/papers/<id>/download` — will 401 if you're not also logged in as a student. This is expected.

**Best practice**: Upload past 3–4 years of papers per subject. The more papers, the more useful the app.

#### 📖 Syllabus

- **Upload**: PDF file + metadata (title, subject code/name, semester, branch, version, modules).
- **Delete**: soft-deletes + R2 delete (same as papers).

**Best practice**: One syllabus per subject per scheme (e.g. `v2019.1`). Update when KTU revises the scheme.

#### 🎓 Timetables

- **Create**: title, exam type, semester, branch (or "ALL"), academic year, + dynamic entry rows (date, session FN/AN, subject code, subject name).
- **List**: shows active + archived timetables.
- **Delete**: hard-deletes.
- **Auto-archive**: creating a new active timetable for a (branch, semester) auto-archives the previous one.

**Note**: The current `Timetable` Prisma model stores top-level metadata only (title, fileUrl, semester, branch, isActive). The admin UI collects richer fields (examType, academicYear, entries) for forward-compat — they're sent in the POST body but currently stripped by the Zod schema. The student Calendar tab shows the timetable card with title + branch + semester + updatedAt.

**Best practice**: Create one active timetable per (branch, semester) before each exam season. The student dashboard shows a countdown to the next exam.

---

## 13. Student-Facing Features

### What students see (no login required)

- Dashboard (with empty states prompting login)
- Papers browser (browse + download requires login)
- Syllabus browser (browse + download requires login)
- Notices feed
- Calendar (academic events; exam timetable tab requires login)
- Search
- Calculators (work offline with sample data)
- Settings (theme, supporter status)

### What requires login

- Downloading PDFs (papers + syllabus)
- Viewing exam timetable (needs semester + branch from profile)
- Real CGPA / SGPA pre-fill in calculators
- Server-side bookmarks
- Server-side calculator history
- Becoming a supporter (needs a student record)

### Login flow

1. Student clicks "Sign in" in the nav.
2. Enters KTU register number + password.
3. BFF calls scraper → scraper logs into KTU portal → returns profile + results.
4. BFF creates `Student` row, caches scraper response (24h), issues JWT cookies.
5. Student UI hydrates with real data.

**KTU password is never stored.** It's sent to the scraper, exchanged for tokens, then discarded. The scraper uses it once per login, then forgets it.

---

## 14. Deployment to Vercel

### Step 1: Push to GitHub

```bash
# After rotating credentials (see §2) and updating .gitignore:
git add .
git status   # verify download/keys.md is NOT in the staged list
git commit -m "feat: production-ready — ads system, mock removal, security hardening"
git push origin main
```

> ⚠️ **Before pushing**: run `git status` and confirm `download/keys.md` is NOT listed. If it is, the `.gitignore` didn't catch it — fix before pushing.

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**.
2. Import `sid2002-N/aiapplication`.
3. **Framework Preset**: Next.js (auto-detected).
4. **Build Command**: `next build` (default).
5. **Output Directory**: `.next` (default).
6. **Install Command**: `npm install` (default).
7. **Don't deploy yet** — click **Environment Variables** first.

### Step 3: Set environment variables

In the Vercel dashboard → **Settings → Environment Variables**, add EVERY var from `.env.local`:

**Copy these from `download/keys.md`** (all 17 server-side vars):
- `DATABASE_URL`, `DIRECT_URL`
- `SCRAPER_API_URL`, `SCRAPER_API_KEY`
- `JWT_SECRET`, `JWT_ACCESS_TTL=3600`, `JWT_REFRESH_TTL=2592000`
- `CACHE_TTL_SECONDS=86400`
- `CRON_SECRET`
- `ADMIN_API_KEY`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**Also add these ads vars** (leave at defaults — don't activate yet):
- `NEXT_PUBLIC_ADS_PROVIDER=banner`
- (Leave the other 10 ads vars unset — they default correctly.)

Set all to **Production + Preview + Development** environments (so preview deploys work too).

### Step 4: Deploy

Click **Deploy**. Vercel runs `npm install` + `npm run build` + deploys. First deploy takes ~2 minutes.

### Step 5: Verify

```bash
# Replace with your Vercel URL
DOMAIN="https://your-project.vercel.app"

curl -sS -o /dev/null -w "Home: %{http_code}\n" $DOMAIN/
curl -sS -o /dev/null -w "Admin: %{http_code}\n" $DOMAIN/admin
curl -sS -o /dev/null -w "Admin notices (no key, 401): %{http_code}\n" $DOMAIN/api/v1/admin/notices
curl -sS -o /dev/null -w "Admin notices (with key): %{http_code}\n" \
  -H "Authorization: Bearer $ADMIN_API_KEY" $DOMAIN/api/v1/admin/notices
```

All should match the local dev results (200 / 200 / 401 / 200).

### Step 6: Set up Razorpay webhook (production)

1. Razorpay dashboard → **Settings → Webhooks → Add New Webhook**.
2. URL: `https://your-project.vercel.app/api/webhooks/razorpay`
3. Events: `payment.captured`, `payment.failed`
4. Secret: same as `RAZORPAY_WEBHOOK_SECRET`.
5. Save.

### Step 7: Custom domain (optional)

Vercel → **Settings → Domains** → add `ktuone.in` (or your domain). Update DNS as Vercel instructs. Update `ADMIN_ALLOWED_ORIGIN` env var if you're using a separate admin subdomain.

---

## 15. Cron Jobs (Auto-Sync Notices)

The app auto-syncs KTU notices every 15 minutes via a Vercel Cron job.

### Already configured

`vercel.json` contains:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-notifications",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### How it works

1. Vercel Cron hits `https://your-domain.vercel.app/api/cron/sync-notifications` every 15 min.
2. The route checks `Authorization: Bearer <CRON_SECRET>` (Vercel automatically sends this).
3. Calls the scraper's `/api/v1/notifications` endpoint.
4. Upserts each notice into `KTUNotice` table (dedup by `key`).

### Verifying

```bash
# Trigger manually (with Bearer secret)
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-project.vercel.app/api/cron/sync-notifications

# Should return:
# {"ok":true,"synced":N,"created":X,"updated":Y,"at":"2026-..."}
```

### Vercel Cron limits

- **Hobby tier**: cron jobs run but may be delayed during high load. For mission-critical sync, consider upgrading to Pro.
- Jobs that take >30s timeout (we set `maxDuration = 30`).

---

## 16. Ads — AdSense & AdMob Activation

The ads system is fully built but **not activated**. Default provider is `banner` (in-house promo CTAs that say "Your banner could be here" + "Go ad-free for ₹99"). Flip a single env var to activate real ads.

### When to activate

1. **AdSense (web)**: Apply at [adsense.google.com](https://adsense.google.com) AFTER your site is live with real content. Google rejects "under construction" sites. Expect 1–14 days for approval.
2. **AdMob (mobile)**: Sign up at [admob.google.com](https://admob.google.com) when you start building the Capacitor mobile app. Approval is faster than AdSense.

### Activating AdSense (web)

After Google approves your AdSense account:

1. **AdSense dashboard → Ads → By ad unit → Display ads → Create**.
2. Create one ad unit per slot you want to monetize. Note each **slot ID** (numeric, e.g. `1234567890`).
3. **AdSense dashboard → Account → Account information** → copy your **Publisher ID** (`ca-pub-XXXXXXXXXXXXXXXX`).
4. In Vercel → **Settings → Environment Variables**, set:
   ```
   NEXT_PUBLIC_ADS_PROVIDER=adsense
   NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
   NEXT_PUBLIC_ADSENSE_SLOTS={"home-top":"1234567890","papers-list":"0987654321","syllabus-list":"...","notices-list":"...","settings-top":"..."}
   ```
   (Only include slots you actually created ad units for. Slots not in the map render nothing.)
5. Optional: `NEXT_PUBLIC_ADSENSE_FORMAT=auto` (default — best for responsive), `NEXT_PUBLIC_ADSENSE_RESPONSIVE=true` (default).
6. **Redeploy** (Vercel auto-redeploys on env var change).
7. Visit your site — you'll see `<ins class="adsbygoogle">` elements where `<BannerAd />` is mounted. Ads fill in within ~10 seconds on first load.

**Ad slots in the app** (where `<BannerAd />` is mounted):
- `home-top` — dashboard, above quick actions
- `papers-list` — papers page, above the grid
- `syllabus-list` — syllabus page, above the grid
- `notices-list` — notices page, above the feed
- `settings-top` — settings page, top

### Activating AdMob (Capacitor mobile)

After wrapping the build with Capacitor (see [§17](#17-mobile-app-capacitor--optional)):

1. **AdMob dashboard → Apps → Add App** → create your app (Android + iOS separately).
2. **AdMob → Ad units → Banner** → create one → note the **ad unit ID** (`ca-app-pub-XXXX/XXXX`).
3. **AdMob → Apps → App settings** → note the **App ID** (`ca-app-pub-XXXX~XXXX`).
4. In Vercel → **Settings → Environment Variables**, set:
   ```
   NEXT_PUBLIC_ADS_PROVIDER=admob
   NEXT_PUBLIC_ADMOB_APP_ID=ca-app-pub-XXXX~XXXX
   NEXT_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-XXXX/XXXX
   ```
5. Optional:
   ```
   NEXT_PUBLIC_ADMOB_BANNER_SIZE=SMART_BANNER
   NEXT_PUBLIC_ADMOB_POSITION=BOTTOM_CENTER
   NEXT_PUBLIC_ADMOB_ACTIVE_SLOTS=["home-top"]
   ```
6. Rebuild the Capacitor app: `npm run build && npx cap sync`.

### Switching back to banner (kill switch)

Set `NEXT_PUBLIC_ADS_PROVIDER=banner` (or `none` for no ads at all) and redeploy. Takes effect immediately.

### How supporters interact with ads

- Supporters (paid ₹99) see **no ads** regardless of provider — `<BannerAd />` shows a "Ad-free experience 💜" ribbon instead.
- The AdSense script is never loaded for supporters (no wasted network request).
- The AdMob native banner is `removeBanner()`'d when a user becomes a supporter.

---

## 17. Mobile App (Capacitor) — Optional

The web app is a PWA (installable on mobile via browser). For a native app store presence, wrap with Capacitor.

### Setup

```bash
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor-community/admob   # for AdMob

# 2. Initialize
npx cap init "KTU One" "in.ktuone.app" --web-dir=out

# 3. Configure next.config.ts for static export
# Add to next.config.ts:
#   output: "export",
# Then build:
npm run build

# 4. Add platforms
npx cap add android
npx cap add ios   # requires macOS + Xcode

# 5. Configure AdMob in capacitor.config.ts
# Add:
#   plugins: { AdMob: { appId: "ca-app-pub-XXXX~XXXX" } }

# 6. Sync + open native IDE
npx cap sync
npx cap open android   # opens Android Studio
npx cap open ios       # opens Xcode (macOS only)
```

### Build + deploy

- **Android**: Android Studio → Build → Generate Signed Bundle/APK → upload to Play Store.
- **iOS**: Xcode → Product → Archive → upload to App Store Connect.

### ⚠️ Static export caveats

Switching `output: "export"` disables server-side routes (`/api/*`). You'll need to either:
1. **Keep the API on Vercel** and point the mobile app's fetch URLs to `https://your-domain.vercel.app/api/...`, OR
2. **Self-host the API** separately (e.g. on Railway alongside the scraper).

Option 1 is simpler — the mobile app becomes a thin client to the Vercel-hosted API. Configure the API base URL via a `NEXT_PUBLIC_API_BASE_URL` env var (you'd need to add this — currently the app uses relative URLs).

---

## 18. Post-Deployment Checklist

Run through this after your first deploy:

### ✅ Infrastructure
- [ ] Site loads at `https://your-project.vercel.app` (200 OK)
- [ ] `https://your-project.vercel.app/admin` loads (200 OK)
- [ ] Admin login works with `ADMIN_API_KEY`
- [ ] All 5 admin endpoints return 200 with Bearer key
- [ ] All protected endpoints return 401 without auth
- [ ] Cron job runs (check Vercel → Functions → `/api/cron/sync-notifications` logs)
- [ ] Rate limiting active (6 rapid login attempts from same IP → 429)

### ✅ Database
- [ ] `npm run db:seed` ran successfully (branches + semesters present)
- [ ] Neon dashboard shows 15 tables with correct row counts

### ✅ Content (add via /admin)
- [ ] At least 1 pinned notice
- [ ] 3–5 recent notices
- [ ] Calendar events for the next 2 weeks
- [ ] At least 1 paper per branch per semester (start with CSE)
- [ ] Syllabus for current semester subjects
- [ ] Active timetable for current exam season

### ✅ Payments
- [ ] Razorpay test mode: supporter purchase completes (test card)
- [ ] Webhook signature verifies (check Razorpay → Webhooks → Logs)
- [ ] After purchase: student sees "Ad-free experience 💜"
- [ ] Switch to live mode before launch (update keys + redeploy)

### ✅ Scraper
- [ ] Real student login works (test with a real KTU account)
- [ ] Profile + results + CGPA populate correctly
- [ ] 24h cache works (second login is instant)

### ✅ Storage
- [ ] Paper upload via admin works (PDF lands in R2 bucket `ktu1`)
- [ ] Paper download via student UI works (signed URL resolves)
- [ ] Syllabus upload + download works

### ✅ Security
- [ ] `download/keys.md` NOT in GitHub repo (`git ls-files download/keys.md` returns empty)
- [ ] All credentials rotated since the leak
- [ ] `ADMIN_API_KEY` is a fresh 64-char hex
- [ ] `JWT_SECRET` is a fresh 128-char hex
- [ ] `CRON_SECRET` is a fresh 64-char hex
- [ ] HTTPS enforced (Vercel does this automatically)
- [ ] Security headers present (check with [securityheaders.com](https://securityheaders.com))

### ✅ Performance
- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices, SEO)
- [ ] First Contentful Paint < 2s
- [ ] No console errors on any page

---

## 19. Maintenance & Troubleshooting

### Common issues

#### "Login failed — KTU's portal is unavailable right now"
- **Cause**: Scraper can't reach `app.ktu.edu.in`.
- **Fix**: Check scraper health at `https://ktugatewayapi-production.up.railway.app/health`. If down, restart the Railway service. If KTU itself is down, wait.

#### "Login failed — Our backend couldn't be reached"
- **Cause**: BFF can't reach the scraper.
- **Fix**: Check `SCRAPER_API_URL` + `SCRAPER_API_KEY` env vars. Check Railway service is running.

#### Admin login shows "Login failed (HTTP 500)"
- **Cause**: Usually a database connection issue (env var wrong) or a Prisma client mismatch.
- **Fix**: 
  1. Check `DATABASE_URL` is the Neon pooler URL (has `-pooler`).
  2. Run `npm run db:generate` + redeploy.
  3. Check Vercel function logs for the actual error.

#### Paper download 401s
- **Cause**: Student not logged in, or access token expired.
- **Fix**: Log in again. If persistent, check `JWT_SECRET` matches between deploys (rotating it invalidates all sessions).

#### Cron job not running
- **Cause**: Vercel Hobby tier may delay crons; or `CRON_SECRET` mismatch.
- **Fix**: Check Vercel → Functions → cron logs. Verify `CRON_SECRET` env var. Manually trigger with `curl -H "Authorization: Bearer $CRON_SECRET" $URL/api/cron/sync-notifications`.

#### Rate limiting not working
- **Cause**: `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` not set.
- **Fix**: Add both env vars in Vercel. The rate limiter silently no-ops without them (check `/api/v1/login` logs for `[ratelimit] no-op mode`).

#### AdSense ads not showing
- **Cause**: Usually the script hasn't loaded yet (10s delay), or the slot ID is wrong.
- **Fix**: 
  1. Open browser DevTools → Network → filter `adsbygoogle.js` — should be 200.
  2. Check Console for AdSense warnings.
  3. Verify `NEXT_PUBLIC_ADSENSE_CLIENT_ID` and `NEXT_PUBLIC_ADSENSE_SLOTS` JSON.
  4. Wait 24h after first activation — AdSense takes time to start serving.

### Regular maintenance

- **Weekly**: Check Vercel function logs for errors. Check Neon DB size (free tier is 0.5GB).
- **Monthly**: Rotate `JWT_SECRET` (invalidates all sessions — students re-login). Check R2 bucket size (delete orphaned objects from deleted papers).
- **Per exam season**: Add new timetable via `/admin`. Upload new papers as they become available.
- **On scraper changes**: If the KTU portal HTML changes, the scraper may break. Monitor the scraper's Railway logs. Update the scraper code + redeploy.

### Backup

- **Database**: Neon has point-in-time recovery (free tier: 7 days). For longer retention, export weekly: `npx prisma db pull && pg_dump $DATABASE_URL > backup.sql`.
- **R2 PDFs**: Cloudflare R2 has 99.999999999% durability. No backup needed.
- **Code**: GitHub is your code backup. Verify pushes succeed.

---

## 20. Credential Rotation

### When to rotate

- **Immediately** — if any credential is leaked (see [§2](#2-🚨-critical-security-fix--do-this-first)).
- **Quarterly** — `JWT_SECRET` (invalidates sessions), `ADMIN_API_KEY`, `CRON_SECRET`.
- **On team changes** — when a developer with access leaves.
- **On suspicion** — if you see unusual admin API activity.

### How to rotate each

#### `JWT_SECRET`
1. Generate new: `openssl rand -hex 64`.
2. Update Vercel env var. Redeploy.
3. **All students get logged out** — they'll need to re-login. This is expected.
4. Old refresh tokens become invalid (their JWTs were signed with the old secret).

#### `ADMIN_API_KEY`
1. Generate new: `openssl rand -hex 32`.
2. Update Vercel env var. Redeploy.
3. Update your local copy (`.env.local` + `download/keys.md`).
4. The old key stops working immediately.

#### `CRON_SECRET`
1. Generate new: `openssl rand -hex 32`.
2. Update Vercel env var. Redeploy.
3. Vercel Cron automatically sends the new secret (it reads from env vars).

#### `RAZORPAY_KEY_SECRET`
1. Razorpay dashboard → **Settings → API Keys → Generate New Key**.
2. Update Vercel env vars (`RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`). Redeploy.
3. Old key stops working immediately.

#### `R2_SECRET_ACCESS_KEY`
1. Cloudflare dashboard → **R2 → Manage R2 API Tokens** → delete old → create new.
2. Update `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` in Vercel. Redeploy.

#### Neon DB password
1. Neon dashboard → **Settings → Connection Details → Reset Password**.
2. Update `DATABASE_URL` + `DIRECT_URL` in Vercel (replace the password in the connection string). Redeploy.
3. Run `npm run db:generate` locally with the new URL.

---

## Quick Reference — File Locations

| What | Where |
|------|-------|
| Env vars (local) | `.env.local` |
| Env vars (template) | `.env.example` |
| All credentials (local, gitignored) | `download/keys.md` |
| Prisma schema | `prisma/schema.prisma` |
| Seed script | `prisma/seed.ts` |
| Admin UI | `src/features/admin/` |
| Admin API routes | `src/app/api/v1/admin/` |
| Student BFF routes | `src/app/api/v1/` |
| Payment webhook | `src/app/api/webhooks/razorpay/route.ts` |
| Cron job | `src/app/api/cron/sync-notifications/route.ts` |
| Middleware (route protection) | `src/middleware.ts` |
| Ads system | `src/lib/providers/ads.ts` + `adsense-script.tsx` + `admob-initializer.tsx` |
| Razorpay server helper | `src/lib/payments/razorpay-server.ts` |
| R2 storage helper | `src/lib/storage/r2.ts` |
| Rate limiting | `src/lib/auth/ratelimit.ts` |
| Student service | `src/lib/providers/student.ts` + `student-http.ts` |
| Scraper client + mapper | `src/lib/scraper/` |
| Vercel cron config | `vercel.json` |
| Dev server launcher | `scripts/dev-start.sh` |
| Worklog (all changes) | `worklog.md` |

---

## Quick Reference — Common Commands

```bash
# Development
npm run dev                          # start dev server (use scripts/dev-start.sh if env var issues)
npm run lint                         # eslint
npx tsc --noEmit                     # typecheck
npm run build                        # production build

# Database
npm run db:generate                  # regenerate Prisma client
npm run db:push                      # push schema to DB
npm run db:seed                      # seed reference data
npm run db:reset                     # ⚠️ DROP ALL DATA + reseed

# Deployment
git push                             # triggers Vercel auto-deploy
vercel --prod                        # manual deploy via CLI

# Capacitor (mobile, optional)
npx cap sync                         # sync web build to native projects
npx cap open android                 # open Android Studio
npx cap open ios                     # open Xcode
```

---

## Final Notes

- **You already have all credentials** in `download/keys.md` — they're now gitignored.
- **Rotate every credential** before going live (they were leaked to GitHub).
- **The app is production-ready** — no mock data, all systems wired, security hardened.
- **Ads are off by default** — flip `NEXT_PUBLIC_ADS_PROVIDER` when ready.
- **The admin panel is your content management system** — everything students see comes from there.
- **Cron runs every 15 min** — notices auto-sync from KTU.

When in doubt, check `worklog.md` — it has a chronological record of every change made to the project.

**Made with 💜 for KTU students.**
