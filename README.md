# KTU One — Student Companion

A student companion app for **APJ Abdul Kalam Technological University (KTU)** students. Track CGPA, browse question papers, check notices, and manage your academic life — built for clarity under exam stress.

**Live:** [ktuone.in](https://ktuone.in)

---

## Features

- **Calculators** — SGPA, CGPA, Attendance, Internal Marks, Pass Calculator (built around KTU's grading scale, works offline)
- **Question Papers** — Browse and download previous KTU question papers by branch, semester, and year
- **Syllabus** — Official KTU syllabus documents for every subject, branch, and semester
- **Notices** — Latest university notices, auto-synced from KTU every 15 minutes via cron
- **Calendar** — Academic events, exam timetables, and countdowns
- **Search** — Universal search across papers, syllabus, notices, calendar, and subjects
- **Supporter** — ₹99 lifetime ad-free via Razorpay

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Storage:** Cloudflare R2 (PDF storage with signed URLs)
- **Payments:** Razorpay (test mode → live mode)
- **Auth:** JWT (httpOnly cookies) + refresh token rotation
- **Rate Limiting:** Upstash Redis
- **UI:** Tailwind CSS, shadcn/ui, Framer Motion, liquid glass design system
- **Fonts:** Source Serif 4 (headings), Inter (body), IBM Plex Mono (codes)
- **Mobile:** Capacitor (hybrid APK with offline persistence, haptics)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun
- A PostgreSQL database (Neon, Supabase, or local)

### Installation

```bash
# Clone
git clone https://github.com/sid2002-N/KTUone.git
cd KTUone

# Install dependencies
npm install

# Copy env template and fill in values
cp .env.example .env.local
# Edit .env.local with your credentials

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed reference data (branches + semesters)
npm run db:seed

# Start dev server
npm run dev
```

### Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection (pooled) |
| `DIRECT_URL` | Neon PostgreSQL connection (direct, for migrations) |
| `SCRAPER_API_URL` | Railway scraper backend URL |
| `SCRAPER_API_KEY` | Scraper API key |
| `JWT_SECRET` | 64-byte hex secret for signing JWTs |
| `ADMIN_API_KEY` | Bearer key for `/api/v1/admin/*` routes |
| `CRON_SECRET` | Bearer key for cron job |
| `R2_*` | Cloudflare R2 credentials for PDF storage |
| `RAZORPAY_*` | Razorpay test/live keys |
| `UPSTASH_*` | Upstash Redis for rate limiting |
| `NEXT_PUBLIC_ADS_PROVIDER` | `banner` (default) \| `adsense` \| `admob` \| `none` |

---

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout (AppShell + overlays + theme script)
│   ├── page.tsx              # Home (/)
│   ├── calculators/page.tsx  # /calculators
│   ├── question-papers/      # /question-papers (redirected from /papers)
│   ├── syllabus/page.tsx     # /syllabus
│   ├── calendar/page.tsx     # /calendar
│   ├── notices/page.tsx      # /notices
│   ├── settings/page.tsx     # /settings
│   ├── admin/page.tsx        # /admin (Bearer key auth)
│   ├── api/                  # 23 API routes
│   ├── sitemap.ts            # /sitemap.xml
│   └── robots.ts             # /robots.txt
├── components/               # Shared UI components
│   ├── layout/               # AppShell, PageHeader
│   ├── ui-custom/            # BannerAd, AcademicStatusCard, EmptyState, etc.
│   └── ui/                   # shadcn/ui components
├── features/                 # Feature modules
│   ├── dashboard/            # Home screen
│   ├── calculators/          # 5 calculators
│   ├── papers/               # Question papers
│   ├── syllabus/             # Syllabus
│   ├── notices/              # Notices
│   ├── calendar/             # Calendar + exam timetable
│   ├── settings/             # Settings
│   ├── admin/                # Admin panel (5 tabs)
│   ├── login/                # Login dialog
│   ├── sync/                 # Sync dialog
│   ├── search/               # Universal search
│   └── bookmarks/            # Hybrid bookmark hook
├── lib/                      # Core libraries
│   ├── providers/            # StudentService, PaymentProvider, AdsProvider
│   ├── storage/              # R2 storage helper
│   ├── payments/             # Razorpay server helper
│   ├── auth/                 # JWT, rate limiting, admin CORS
│   ├── scraper/              # Scraper client + data mapper
│   └── utils/                # Haptics, text cleaning, calculators
├── store/                    # Zustand stores
└── middleware.ts             # Route protection (JWT cookie verification)
```

---

## Database Schema

15 Prisma models:

- **Reference:** Branch, Semester, Subject
- **Content:** QuestionPaper, Syllabus, KTUNotice, CalendarEvent, Timetable
- **Auth:** Student, CachedStudentData, RefreshToken
- **User data:** Bookmark, CalculatorHistoryEntry, SupporterPurchase
- **Settings:** AppSettings

---

## API Routes (23 total)

### Public
- `POST /api/v1/login` — Login with KTU credentials (rate limited)
- `POST /api/v1/refresh` — Refresh access token (rate limited)
- `POST /api/v1/logout` — Revoke refresh tokens

### Student (JWT-protected)
- `GET /api/v1/profile` — Student profile
- `GET /api/v1/results` — Semester results
- `GET /api/v1/cgpa` — CGPA calculation
- `GET /api/v1/bookmarks` — Bookmarks (CRUD)
- `GET /api/v1/calc-history` — Calculator history (CRUD)
- `GET /api/v1/papers/[id]/download` — PDF download (signed URL)
- `GET /api/v1/syllabus/[id]/download` — PDF download (signed URL)
- `POST /api/v1/payments/create-order` — Razorpay order creation
- `POST /api/v1/payments/verify` — Payment signature verification
- `POST /api/v1/payments/restore` — Restore supporter status

### Admin (Bearer key)
- `GET/POST/PUT/DELETE /api/v1/admin/notices`
- `GET/POST/PUT/DELETE /api/v1/admin/calendar`
- `GET/DELETE /api/v1/admin/papers` + `POST /api/v1/admin/papers/upload`
- `GET/DELETE /api/v1/admin/syllabus` + `POST /api/v1/admin/syllabus/upload`
- `GET/POST/DELETE /api/v1/admin/timetables`

### System
- `GET /api/cron/sync-notifications` — Cron job (Bearer secret)
- `POST /api/webhooks/razorpay` — Payment webhook

---

## Deployment

### Web (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Set all 17 env vars (see `.env.example`)
4. Deploy
5. Set up Razorpay webhook → `https://ktuone.in/api/webhooks/razorpay`

See [`guide.md`](./guide.md) for the full deployment guide.

### Mobile (Capacitor APK)

1. `npm install @capacitor/core @capacitor/cli @capacitor/haptics`
2. `npx cap init "KTU One" "in.ktuone.app" --web-dir=out`
3. `npm run build && npx cap add android`
4. `npx cap copy android && npx cap open android`
5. Build APK in Android Studio

See [`guide.md` Part 2](./guide.md) for the full Capacitor guide with offline persistence.

---

## Ads System

4 modes, switched via `NEXT_PUBLIC_ADS_PROVIDER`:

| Mode | Description |
|------|-------------|
| `banner` (default) | In-house promotional CTAs — safe to ship anytime |
| `adsense` | Google AdSense (web) — activate after approval |
| `admob` | Google AdMob (Capacitor native) — activate for mobile |
| `none` | Kill switch — no ads anywhere |

Supporters (₹99) see no ads regardless of mode.

---

## SEO

- ✅ Separate routes for each page (`/`, `/calculators`, `/question-papers`, etc.)
- ✅ Unique `<title>` + meta description per route
- ✅ Canonical URLs on every page
- ✅ Open Graph + Twitter Card metadata
- ✅ JSON-LD structured data (EducationalApplication, CollectionPage, WebApplication)
- ✅ `sitemap.xml` (auto-generated, excludes noindex pages)
- ✅ `robots.txt` (allows all, disallows /admin + /api + /settings)
- ✅ OG image (1200×630, branded)
- ✅ PWA manifest with 192×192 + 512×512 icons

---

## Security

- JWT access tokens (1h, httpOnly cookies)
- Refresh token rotation (old token revoked on each refresh)
- Rate limiting on login (5/15min) and refresh (30/hour)
- Bearer API key for admin routes
- Bearer secret for cron job
- Razorpay webhook signature verification (HMAC-SHA256 + timing-safe compare)
- R2 signed URLs (2-minute expiry) for PDF downloads
- Middleware blocks all `/api/v1/*` routes without valid JWT
- Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)

---

## License

This is an independent project, not affiliated with APJ Abdul Kalam Technological University.

---

## Contributing

This is a solo project. If you'd like to contribute, please open an issue first.
