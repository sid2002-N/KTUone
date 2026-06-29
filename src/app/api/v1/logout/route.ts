/**
 * POST /api/v1/logout
 * Revokes all refresh tokens for the authenticated student and clears cookies.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedStudent,
  revokeAllRefreshTokens,
  clearSessionCookies,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const student = await getAuthenticatedStudent(req);

  // Even if the access token is expired, we still want to clear cookies.
  // Try to read the refresh token's subject indirectly by revoking via studentId
  // (only if access token was valid). Otherwise just clear cookies.
  if (student) {
    await revokeAllRefreshTokens(student.studentId);
  }

  await clearSessionCookies();

  return NextResponse.json({ ok: true });
}
