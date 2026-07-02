# KTU One — All Credentials & Environment Variables

> ⚠️ **NEVER commit this file to git.** It contains real production secrets.
> This file is in `.gitignore` — verify before pushing.

## Database (Neon PostgreSQL)

```
DATABASE_URL=postgresql://neondb_owner:npg_TJZUvxBEDg21@ep-shiny-dawn-atdexl0r-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_TJZUvxBEDg21@ep-shiny-dawn-atdexl0r.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## Scraper Backend (Railway)

```
SCRAPER_API_URL=https://ktugatewayapi-production.up.railway.app
SCRAPER_API_KEY=b4361ae2903028b23e6a8e7ab88c656a41257d0be26db750e138d4da2b244399
```

## JWT Authentication

```
JWT_SECRET=6561a70b87ee66b25228714f79d4bb59375c4da88eaeabc16adaece49c572f6da11e9f89a9ad8f1628cea9e82bbc08862c6f2bde398dc53a45fa6c6d69c72040
JWT_ACCESS_TTL=3600
JWT_REFRESH_TTL=2592000
```

## Cache

```
CACHE_TTL_SECONDS=86400
```

## Cron Protection

```
CRON_SECRET=b8a9d971b00f49177f0782da1f6939f1d7f1faaac3885287cf73d5e427d08e4b
```

## Admin API

```
ADMIN_API_KEY=a11179e1ba61fbfa494c2626ac74c1491bf37b622fd7f40e116018f84553c964
```

Admin login URL: `https://your-app.vercel.app/admin`
Enter the ADMIN_API_KEY value above to access the content management dashboard.

## Cloudflare R2 (Private Bucket)

```
R2_ACCOUNT_ID=2f1d23e81b60d0ab1b23de2a84a9339e
R2_ACCESS_KEY_ID=93314d2fe32674e769f5ffa8fed16a98
R2_SECRET_ACCESS_KEY=886861176c56e84c302f45ceb1ccad646a325e7e5bed09865dbf0371b386815a
R2_BUCKET_NAME=ktu1
```

R2 Endpoint: `https://2f1d23e81b60d0ab1b23de2a84a9339e.r2.cloudflarestorage.com`

## Razorpay (Test Mode)

```
RAZORPAY_KEY_ID=rzp_test_T7vCe92hXE1xyq
RAZORPAY_KEY_SECRET=yjmRRJ6GIoRmPyu6Lsiyl2u3
RAZORPAY_WEBHOOK_SECRET=3jYDJnBmLMsG!58
```

Webhook URL (set in Razorpay dashboard): `https://your-app.vercel.app/api/webhooks/razorpay`

Test card: `4111 1111 1111 1111` (any expiry, any CVV)

**For production:** Switch `rzp_test_` to `rzp_live_` keys after KYC completion.

## Upstash Redis (NOT YET SET UP — needed for rate limiting)

```
UPSTASH_REDIS_REST_URL=<not set — create at upstash.com>
UPSTASH_REDIS_REST_TOKEN=<not set>
```

## Admin CORS (NOT YET SET UP — needed if admin UI is on a different domain)

```
ADMIN_ALLOWED_ORIGIN=https://admin.ktuone.in
```

---

## Vercel Deployment

When deploying to Vercel, add ALL the above variables (except Upstash and Admin CORS which are optional for initial deploy) to:

**Vercel → Project Settings → Environment Variables**

### Same values (copy directly):
- `SCRAPER_API_URL`
- `SCRAPER_API_KEY`
- `JWT_SECRET`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_TTL`
- `CACHE_TTL_SECONDS`
- `CRON_SECRET`
- `ADMIN_API_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

### Different in production:
- `DATABASE_URL` — same Neon connection string (already cloud-hosted)
- `DIRECT_URL` — same Neon direct connection string

### Add when ready:
- `UPSTASH_REDIS_REST_URL` — from upstash.com (enables rate limiting)
- `UPSTASH_REDIS_REST_TOKEN` — from upstash.com
- `ADMIN_ALLOWED_ORIGIN` — `https://admin.ktuone.in` (when you build the separate admin app)

---

## Security Reminders

1. **Rotate all secrets before going public** — these have been shared in chat
2. **Never commit `.env.local` or `keys.md` to git** — both are in `.gitignore`
3. **Use different JWT_SECRET and ADMIN_API_KEY for production** — regenerate with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
4. **Razorpay:** Switch from `rzp_test_` to `rzp_live_` only after testing is complete
5. **R2:** The bucket is private — all access is via signed URLs (2-minute expiry)
