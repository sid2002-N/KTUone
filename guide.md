# KTU One — Hosting + Hybrid Capacitor APK Guide

This guide covers two things:
1. **Where to host every service** for production (web app + backend)
2. **How to build a hybrid Capacitor APK** with offline data persistence

---

## Part 1: Where to Host Everything

KTU One is a Next.js app that talks to 6 external services. Here's where each one lives:

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Next.js hosting)                  │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │  Student UI  │   │  Admin UI    │   │  API Routes  │    │
│  │  (7 screens) │   │  (/admin)    │   │  (/api/v1/*) │    │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘    │
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
    └─────────────┘  └──────┬──────┘  └─────────────┘
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

### Service-by-Service Hosting

#### 1. Vercel — Web App Hosting (FREE)

**What:** Hosts the Next.js app (student UI + admin panel + all API routes)

**Why Vercel:**
- Zero-config Next.js deployment
- Edge functions for middleware
- Automatic HTTPS
- Free Hobby tier (100GB bandwidth, unlimited deployments)
- Built-in cron jobs

**Setup:**
1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Import your GitHub repo
3. Set all 17 env vars (see `.env.example` or `download/keys.md`)
4. Deploy

**Cost:** Free (Hobby tier is enough for a student app)

---

#### 2. Neon — PostgreSQL Database (FREE)

**What:** Hosts the database (15 tables: students, papers, notices, etc.)

**Why Neon:**
- Serverless PostgreSQL (scales to zero when idle)
- Free tier: 0.5GB storage, unlimited databases
- Point-in-time recovery (7-day history)
- Connection pooling built-in

**Setup:**
1. Go to [neon.tech](https://neon.tech) → Sign up
2. Create a project → Copy the connection strings:
   - `DATABASE_URL` (pooled — for app queries)
   - `DIRECT_URL` (direct — for Prisma migrations)
3. Run `npm run db:push` to create tables
4. Run `npm run db:seed` to add reference data (branches, semesters)

**Cost:** Free (0.5GB is plenty for thousands of papers + notices)

---

#### 3. Railway — Scraper Backend ($5/mo)

**What:** Hosts the KTU scraper (logs into app.ktu.edu.in, fetches student data)

**Why Railway:**
- Always-on (unlike serverless, keeps the session warm)
- Easy env var management
- Automatic deploys from GitHub
- $5/mo includes 500GB bandwidth

**Setup:**
1. The scraper is already deployed at `https://ktugatewayapi-production.up.railway.app`
2. Env vars on Railway: `API_KEY` (matches your `SCRAPER_API_KEY`)
3. If you need to redeploy: push scraper code to GitHub → connect to Railway

**Cost:** $5/mo (after free trial)

---

#### 4. Cloudflare R2 — PDF Storage (FREE)

**What:** Stores question paper PDFs + syllabus PDFs

**Why R2:**
- S3-compatible API
- Free tier: 10GB storage + 1M reads/mo + 10M writes/mo
- No egress fees (unlike AWS S3)
- Private buckets with signed URLs

**Setup:**
1. Go to [cloudflare.com](https://cloudflare.com) → Sign up
2. R2 Object Storage → Create bucket (`ktu1`)
3. R2 API Tokens → Create token with Object Read & Write permissions
4. Copy: Account ID, Access Key ID, Secret Access Key

**Cost:** Free (10GB is enough for ~2000 PDFs)

---

#### 5. Upstash Redis — Rate Limiting (FREE)

**What:** Rate limits login + refresh endpoints (prevents brute force)

**Why Upstash:**
- Serverless Redis (REST API, no persistent connections)
- Free tier: 10,000 requests/day
- Works with Edge middleware

**Setup:**
1. Go to [upstash.com](https://upstash.com) → Sign up
2. Create database → Copy REST URL + REST token
3. Set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in Vercel

**Cost:** Free (10k req/day is plenty)

---

#### 6. Razorpay — Payments (FREE)

**What:** Processes ₹99 lifetime supporter payments

**Why Razorpay:**
- Indian payment gateway (UPI, cards, netbanking)
- Test mode (no real money)
- Webhook notifications
- 2% transaction fee on live mode

**Setup:**
1. Go to [razorpay.com](https://razorpay.com) → Sign up
2. Test mode: API Keys → Copy Key ID + Secret
3. Webhooks: Add webhook URL → `https://yourdomain.vercel.app/api/webhooks/razorpay`
4. Webhook secret: Copy to `RAZORPAY_WEBHOOK_SECRET`
5. When ready for real money: Switch to Live mode + update keys

**Cost:** Free (test mode) / 2% per transaction (live mode)

---

### Total Monthly Cost

| Service | Free Tier | Paid (if you exceed) |
|---------|-----------|---------------------|
| Vercel | $0 | $0 (Hobby is enough) |
| Neon | $0 | $0 (0.5GB is enough) |
| Railway | $0 (trial) | $5/mo |
| Cloudflare R2 | $0 | $0.015/GB over 10GB |
| Upstash | $0 | $0 (10k req/day is enough) |
| Razorpay | $0 | 2% per transaction |
| **Total** | **$0** | **$5/mo** |

---

### Deployment Checklist

1. **Push to GitHub** — `git push origin main`
2. **Vercel** — Import repo, set 17 env vars, deploy
3. **Neon** — Already set up, just verify connection
4. **Railway** — Already deployed, verify scraper health
5. **R2** — Already set up, verify bucket exists
6. **Upstash** — Create database, set env vars in Vercel
7. **Razorpay** — Set up webhook URL in Razorpay dashboard
8. **Custom domain** (optional) — Add `ktuone.in` in Vercel
9. **Add content** — Log into `/admin` + add papers, notices, etc.
10. **Apply for AdSense** — After site is live with real content

---

## Part 2: Hybrid Capacitor APK (Offline Persistence)

This section covers how to build a hybrid Android/iOS APK using Capacitor. The app will:
- **Work offline** for browsing papers, notices, syllabus, and cached data
- **Require internet** for login, sync, payments, and admin operations
- **Persist data locally** using IndexedDB (via Dexie.js) for offline access

### Architecture: Online vs Offline

```
┌─────────────────────────────────────────────────────────┐
│                  Capacitor App (APK)                     │
│                                                          │
│  ┌─────────────┐     ┌─────────────────────────────┐    │
│  │  Next.js    │     │  IndexedDB (Dexie.js)       │    │
│  │  Web View   │────▶│  - Cached papers            │    │
│  │  (UI)       │     │  - Cached notices           │    │
│  │             │     │  - Cached syllabus          │    │
│  └──────┬──────┘     │  - Cached calendar events   │    │
│         │            │  - Calculator history       │    │
│         │            │  - Bookmarks (offline)       │    │
│         │            │  - Last synced profile       │    │
│         │            └─────────────────────────────┘    │
│         │                                                 │
│         ▼                                                 │
│  ┌─────────────┐     ┌─────────────────────────────┐    │
│  │ Capacitor   │     │  Online-only operations:    │    │
│  │ Plugins     │     │  - Login (scraper)          │    │
│  │ - Haptics   │     │  - Sync (re-scrape)         │    │
│  │ - Browser   │     │  - Payments (Razorpay)      │    │
│  │ - Network   │     │  - PDF download (R2)        │    │
│  │ - Toast     │     │  - Admin panel              │    │
│  └─────────────┘     └─────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### What Works Offline vs Online

| Feature | Offline | Online |
|---------|---------|--------|
| Browse papers (cached) | ✅ | ✅ |
| Browse notices (cached) | ✅ | ✅ |
| Browse syllabus (cached) | ✅ | ✅ |
| Browse calendar (cached) | ✅ | ✅ |
| Calculators | ✅ | ✅ |
| Bookmarks (localStorage) | ✅ | ✅ |
| Calculator history (localStorage) | ✅ | ✅ |
| View cached CGPA/profile | ✅ | ✅ |
| **Login** | ❌ | ✅ |
| **Sync fresh data** | ❌ | ✅ |
| **Download new PDFs** | ❌ | ✅ |
| **Payments** | ❌ | ✅ |
| **Admin panel** | ❌ | ✅ |
| **Search (server-side)** | ❌ (local only) | ✅ |

---

### Step 1: Install Capacitor

```bash
# Install Capacitor core + CLI
npm install @capacitor/core @capacitor/cli

# Install the haptics plugin (for iOS/Android vibration)
npm install @capacitor/haptics

# Install the network plugin (for online/offline detection)
npm install @capacitor/network

# Initialize Capacitor
npx cap init "KTU One" "in.ktuone.app" --web-dir=out
```

This creates `capacitor.config.ts` in your project root.

---

### Step 2: Configure Static Export

The hybrid APK needs a **static export** of the Next.js app (no server-side rendering). But our app uses API routes + Server Actions, so we can't fully static-export.

**Solution:** Keep the API on Vercel. The APK becomes a thin client that calls the Vercel API.

**Option A: Static export + remote API (recommended for APK)**

Update `next.config.ts`:
```ts
const nextConfig: NextConfig = {
  output: "export",  // Static export for Capacitor
  // ... rest of config
};
```

Then update the fetch URLs in the client code to point to your Vercel domain:

Create `src/lib/config.ts`:
```ts
// When running as a Capacitor app, API calls go to the Vercel backend.
// When running as a web app, API calls are relative (same origin).
export const API_BASE_URL =
  typeof window !== "undefined" && window.Capacitor?.isNativePlatform()
    ? "https://your-app.vercel.app"
    : "";
```

Then replace all `fetch("/api/v1/...")` calls with `fetch(`${API_BASE_URL}/api/v1/...`)`.

**Option B: Keep server mode + WebView (simpler, less offline)**

Don't change `next.config.ts`. Build normally + point Capacitor at the Vercel URL. The APK is basically a PWA wrapper. Less offline capability but simpler setup.

---

### Step 3: Add Offline Persistence with Dexie.js (IndexedDB)

```bash
npm install dexie
```

Create `src/lib/offline/db.ts`:
```ts
import Dexie, { type Table } from "dexie";

// IndexedDB database for offline caching.
// All data is stored locally so the app works without internet.
// When online, data syncs from the Vercel API → IndexedDB.
// When offline, the app reads from IndexedDB.

export interface CachedPaper {
  id: string;
  title: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  branchCode: string;
  year: number;
  month: number;
  examType: string;
  fileSizeBytes: number;
  pageCount: number;
  downloads: number;
  views: number;
  uploadedAt: string;
  cachedAt: number; // when we cached this
}

export interface CachedNotice {
  id: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  priority: string;
  pinned: boolean;
  cachedAt: number;
}

export interface CachedEvent {
  id: string;
  title: string;
  description: string;
  type: string;
  startDate: string;
  endDate: string;
  color: string;
  cachedAt: number;
}

export interface CachedProfile {
  id: string;
  registerNumber: string;
  name: string;
  branchCode: string;
  branchName: string;
  semester: number;
  avatarInitials: string;
  cachedAt: number;
}

export interface CachedCGPA {
  cgpa: number;
  totalCredits: number;
  creditsEarned: number;
  cachedAt: number;
}

class OfflineDB extends Dexie {
  papers!: Table<CachedPaper, string>;
  notices!: Table<CachedNotice, string>;
  events!: Table<CachedEvent, string>;
  profile!: Table<CachedProfile, string>;
  cgpa!: Table<CachedCGPA, string>;

  constructor() {
    super("ktu_one_offline");
    this.version(1).stores({
      papers: "id, subjectCode, branchCode, semester, year, cachedAt",
      notices: "id, category, publishedAt, cachedAt",
      events: "id, startDate, cachedAt",
      profile: "id",
      cgpa: "id",
    });
  }
}

export const offlineDB = new OfflineDB();

// Cache helpers — call these after each successful API fetch
export async function cachePapers(papers: CachedPaper[]) {
  await offlineDB.papers.bulkPut(papers.map(p => ({ ...p, cachedAt: Date.now() })));
}

export async function cacheNotices(notices: CachedNotice[]) {
  await offlineDB.notices.bulkPut(notices.map(n => ({ ...n, cachedAt: Date.now() })));
}

export async function cacheEvents(events: CachedEvent[]) {
  await offlineDB.events.bulkPut(events.map(e => ({ ...e, cachedAt: Date.now() })));
}

export async function cacheProfile(profile: CachedProfile) {
  await offlineDB.profile.put({ ...profile, cachedAt: Date.now() });
}

export async function cacheCGPA(cgpa: CachedCGPA) {
  await offlineDB.cgpa.put({ ...cgpa, id: "current", cachedAt: Date.now() });
}

// Read helpers — call these when offline
export async function getCachedPapers(): Promise<CachedPaper[]> {
  return offlineDB.papers.toArray();
}

export async function getCachedNotices(): Promise<CachedNotice[]> {
  return offlineDB.notices.orderBy("publishedAt").reverse().toArray();
}

export async function getCachedEvents(): Promise<CachedEvent[]> {
  return offlineDB.events.toArray();
}

export async function getCachedProfile(): Promise<CachedProfile | undefined> {
  return offlineDB.profile.toCollection().first();
}

export async function getCachedCGPA(): Promise<CachedCGPA | undefined> {
  return offlineDB.cgpa.get("current");
}
```

---

### Step 4: Network Status Hook

Create `src/hooks/use-online.ts`:
```ts
import { useState, useEffect } from "react";

export function useOnline() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Use Capacitor Network plugin if available, otherwise browser API
    if (typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.()) {
      // Capacitor native
      import("@capacitor/network").then(({ Network }) => {
        Network.addListener("networkStatusChange", (status) => {
          setIsOnline(status.connected);
        });
        Network.getStatus().then((status) => setIsOnline(status.connected));
      });
    } else if (typeof navigator !== "undefined") {
      // Browser
      setIsOnline(navigator.onLine);
      const onOnline = () => setIsOnline(true);
      const onOffline = () => setIsOnline(false);
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    }
  }, []);

  return isOnline;
}
```

---

### Step 5: Update Data Hooks to Use Offline Cache

Update TanStack Query hooks to fall back to IndexedDB when offline. Example for papers:

```ts
// In src/features/papers/actions.ts — add offline fallback
import { offlineDB, cachePapers, getCachedPapers } from "@/lib/offline/db";

export async function getPapers(filters: PaperFilters = {}): Promise<QuestionPaper[]> {
  // Check if online
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    // Offline — read from IndexedDB
    const cached = await getCachedPapers();
    // Apply filters locally
    return cached.filter(p => {
      if (filters.branch && filters.branch !== "ALL" && p.branchCode !== filters.branch) return false;
      if (filters.semester && filters.semester !== "ALL" && p.semester !== filters.semester) return false;
      if (filters.year && filters.year !== "ALL" && p.year !== filters.year) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.subjectName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  // Online — fetch from DB (existing Server Action code)
  const where: Record<string, unknown> = { deletedAt: null };
  // ... existing filter logic ...

  const rows = await db.questionPaper.findMany({ where, orderBy: [...], take: 100 });
  const papers = rows.map(r => ({ ... }));

  // Cache for offline use
  await cachePapers(papers);

  return papers;
}
```

Do the same for notices, calendar events, and profile/CGPA.

---

### Step 6: Add Offline Indicator

Add a banner at the top of the app when offline:

```tsx
// In src/components/layout/app-shell.tsx
import { useOnline } from "@/hooks/use-online";

// Inside the AppShell component:
const isOnline = useOnline();

// Add below the header:
{!isOnline && (
  <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-600">
    You're offline. Showing cached data. Login and sync require internet.
  </div>
)}
```

---

### Step 7: Build the APK

```bash
# 1. Build the Next.js static export
npm run build

# 2. Add Android platform
npx cap add android

# 3. Copy web build to native project
npx cap copy android

# 4. Open in Android Studio
npx cap open android

# 5. In Android Studio:
#    - Build → Generate Signed Bundle/APK
#    - Create a keystore (save it safely — you need it for all future updates)
#    - Build APK or AAB (for Play Store)
```

For iOS (requires macOS + Xcode):
```bash
npx cap add ios
npx cap copy ios
npx cap open ios
# In Xcode: Product → Archive → Upload to App Store Connect
```

---

### Step 8: Configure capacitor.config.ts

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.ktuone.app",
  appName: "KTU One",
  webDir: "out",
  server: {
    // If using Option B (server mode), uncomment:
    // url: "https://your-app.vercel.app",
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: "#111315",
      showSpinner: false,
    },
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
```

---

### Step 9: Handle CORS for Capacitor

The Capacitor app makes API calls from `capacitor://localhost` (iOS) or `http://localhost` (Android). Your Vercel API needs to allow these origins.

Update `src/middleware.ts` — add Capacitor origins to the allowed list:

```ts
const CAPACITOR_ORIGINS = [
  "capacitor://localhost",
  "http://localhost",
  "https://your-app.vercel.app",
];

// In the middleware, allow these origins for API routes
```

Update `next.config.ts`:
```ts
experimental: {
  serverActions: {
    allowedOrigins: [
      "*.space-z.ai",
      "*.fcapp.run",
      "*.vercel.app",
      "capacitor://localhost",
      "http://localhost",
    ],
  },
},
```

---

### Step 10: Offline PDF Viewing (Optional, Advanced)

For true offline PDF access, you'd need to:
1. Download PDFs from R2 + store in Capacitor's Filesystem
2. Open from local storage when offline

```bash
npm install @capacitor/filesystem
```

```ts
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

// Download + cache a PDF
async function cachePdf(paperId: string, signedUrl: string) {
  const res = await fetch(signedUrl);
  const blob = await res.blob();
  const base64 = await blobToBase64(blob);

  await Filesystem.writeFile({
    path: `papers/${paperId}.pdf`,
    data: base64,
    directory: Directory.Cache,
  });
}

// Read cached PDF
async function getCachedPdfUrl(paperId: string): Promise<string> {
  const uri = await Filesystem.getUri({
    directory: Directory.Cache,
    path: `papers/${paperId}.pdf`,
  });
  return uri.uri; // Capacitor converts this to a readable file:// URL
}
```

This is optional — for most students, online PDF download is sufficient.

---

### APK Build Summary

| Step | Command |
|------|---------|
| Install Capacitor | `npm install @capacitor/core @capacitor/cli @capacitor/haptics @capacitor/network` |
| Install offline DB | `npm install dexie` |
| Init Capacitor | `npx cap init "KTU One" "in.ktuone.app" --web-dir=out` |
| Build web app | `npm run build` |
| Add Android | `npx cap add android` |
| Copy web build | `npx cap copy android` |
| Open Android Studio | `npx cap open android` |
| Build APK | Android Studio → Build → Generate Signed APK |

---

### Play Store Upload

1. **Create a Google Play Developer account** ($25 one-time fee)
2. Go to [play.google.com/console](https://play.google.com/console)
3. Create app → Fill in store listing
4. Upload `.aab` file (Android App Bundle — preferred over APK)
5. Add screenshots, description, privacy policy URL
6. Submit for review (usually 1-3 days)

### App Store Upload (iOS)

1. **Create an Apple Developer account** ($99/year)
2. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
3. Create app → Fill in listing
4. Upload via Xcode (Archive → Upload)
5. Submit for review (usually 1-2 days)

---

## Quick Reference

### Web Deployment (Vercel)
```bash
git push origin main  # Vercel auto-deploys
```

### APK Build
```bash
npm run build
npx cap copy android
npx cap open android
# Android Studio → Build → Generate Signed APK
```

### Sync Code to Native
After any web code change:
```bash
npm run build
npx cap copy
```

### Environment Variables for Capacitor

The Capacitor app talks to your Vercel API. All server-side env vars stay on Vercel. The APK only needs:
- `NEXT_PUBLIC_ADS_PROVIDER` (for AdMob: set to `admob`)
- `NEXT_PUBLIC_ADMOB_APP_ID`
- `NEXT_PUBLIC_ADMOB_BANNER_ID`

These are baked into the build at compile time.

---

## Total Cost Summary

| Service | Web | Mobile |
|---------|-----|--------|
| Vercel | $0 | $0 |
| Neon | $0 | — |
| Railway | $5/mo | — |
| Cloudflare R2 | $0 | — |
| Upstash | $0 | — |
| Razorpay | 2% per txn | — |
| Google Play | — | $25 one-time |
| Apple Dev | — | $99/year |
| **Total** | **$5/mo** | **$25 one-time (Android) or $99/year (iOS)** |
