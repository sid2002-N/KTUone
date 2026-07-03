import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  allowedDevOrigins: ["*.space-z.ai", "*.fcapp.run", "localhost", "127.0.0.1"],
  async redirects() {
    return [
      {
        source: "/papers",
        destination: "/question-papers",
        permanent: true,
      },
    ];
  },
  /**
   * Server Actions CSRF protection: by default, Next.js rejects Server Action
   * requests where the `origin` header doesn't match the `host` /
   * `x-forwarded-host` header. In preview environments (z.ai preview proxy,
   * Vercel preview deploys) the browser origin differs from the internal
   * forwarded host, which causes "Invalid Server Actions request" errors and
   * breaks every screen that calls a Server Action (papers, syllabus, notices,
   * calendar, search, dashboard, calc history, bookmarks).
   *
   * `allowedOrigins` safelists additional origins that may call Server Actions.
   * On Vercel production, your custom domain (e.g. `ktuone.in`) is
   * automatically allowed; only preview deploys need the patterns below.
   *
   * NOTE: In Next.js 16 this lives under `experimental.serverActions`, not at
   * the top level (Next.js 15 allowed top-level but 16 moved it back).
   */
  experimental: {
    serverActions: {
      allowedOrigins: [
        "*.space-z.ai",
        "preview-*.space-z.ai",
        "*.fcapp.run",
        "*.vercel.app",
      ],
    },
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};
export default nextConfig;

