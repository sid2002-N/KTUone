/**
 * Admin CORS helper.
 *
 * Used by /api/v1/admin/* routes which authenticate via a Bearer API key
 * (ADMIN_API_KEY) rather than the JWT cookie used by student routes.
 *
 * Because the admin panel is a separate origin (e.g. admin.ktuone.in) calling
 * the main API, we need explicit CORS headers — but only on admin routes.
 *
 * Env vars: ADMIN_ALLOWED_ORIGIN (production allow-list, e.g.
 *           "https://admin.ktuone.in"). In development, all origins are
 *           allowed (`*`).
 */
import { NextResponse } from "next/server";

function getAllowedOrigin(): string {
  if (process.env.NODE_ENV === "production") {
    return process.env.ADMIN_ALLOWED_ORIGIN ?? "";
  }
  return "*";
}

/**
 * Build the standard CORS header set for admin responses.
 *
 * `Access-Control-Allow-Origin` is either `*` (dev) or the configured
 * `ADMIN_ALLOWED_ORIGIN` (prod). We also set `Vary: Origin` so caches
 * don't leak a prod-origin response to a different requester.
 */
export function getAdminCorsHeaders(): Record<string, string> {
  const origin = getAllowedOrigin();
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/**
 * Wrap a JSON response with admin CORS headers.
 *
 * Usage:
 *   return adminJsonResponse({ ok: true }, 200);
 */
export function adminJsonResponse(
  body: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: getAdminCorsHeaders(),
  });
}

/**
 * Handle a CORS preflight OPTIONS request for admin routes.
 *
 * Returns 204 No Content with the CORS headers. Route handlers should call
 * this in their exported `OPTIONS` function:
 *
 *   export async function OPTIONS() {
 *     return handleAdminOptions();
 *   }
 */
export function handleAdminOptions(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getAdminCorsHeaders(),
  });
}
