/**
 * Next.js middleware — defense-in-depth route protection for /api/v1/*.
 *
 * This is the SECOND layer of auth (the FIRST is the handler itself, which
 * re-verifies via `getAuthenticatedStudent`). It exists to short-circuit
 * obviously-unauthenticated requests before they reach the database layer.
 *
 * Public (no auth):     /api/v1/login, /api/v1/refresh, /api/v1/logout
 * Bearer API key:       /api/v1/admin/* (handler verifies ADMIN_API_KEY)
 * Handler-owns-auth:    /api/v1/papers/[id]/download,
 *                        /api/v1/syllabus/[id]/download
 *                        (these redirect to signed R2 URLs; the handler
 *                         calls getAuthenticatedStudent itself)
 * Everything else:      requires a valid `ktu_access` JWT cookie.
 *
 * JWT verification uses `jose` directly (not @/lib/auth, which pulls in
 * `next/headers` and Prisma — both unavailable in the edge middleware
 * runtime).
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_COOKIE = "ktu_access";

const PUBLIC_ROUTES = new Set<string>([
  "/api/v1/login",
  "/api/v1/refresh",
  "/api/v1/logout",
]);

// Match /api/v1/papers/<id>/download and /api/v1/syllabus/<id>/download
// where <id> is any non-slash path segment.
const DOWNLOAD_ROUTE_RE =
  /^\/api\/v1\/(?:papers|syllabus)\/[^/]+\/download$/;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET env var not configured");
  return new TextEncoder().encode(secret);
}

async function isAccessTokenValid(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload.type === "access";
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Public auth routes (login/refresh/logout) — always allow.
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // 2. Admin routes — use Bearer API key auth, verified in the handler.
  //    Middleware must NOT enforce the JWT cookie here.
  if (pathname.startsWith("/api/v1/admin/") || pathname === "/api/v1/admin") {
    return NextResponse.next();
  }

  // 3. Download routes — handler does its own auth (it needs the student id
  //    to sign the R2 URL and to increment download counters).
  if (DOWNLOAD_ROUTE_RE.test(pathname)) {
    return NextResponse.next();
  }

  // 4. All other /api/v1/* routes require a valid access-token cookie.
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (await isAccessTokenValid(token)) {
    return NextResponse.next();
  }

  return NextResponse.json(
    {
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    },
    { status: 401 },
  );
}

export const config = {
  // Only run middleware on /api/v1/* — never on static assets or pages.
  matcher: ["/api/v1/:path*"],
};
