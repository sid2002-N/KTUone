/**
 * POST /api/v1/refresh
 * Reads refresh token from httpOnly cookie, validates it, issues a new access token.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyRefreshToken,
  compareRefreshToken,
  signAccessToken,
  ACCESS_COOKIE_NAME,
} from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("ktu_refresh")?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: { code: "NO_REFRESH_TOKEN", message: "No refresh token cookie" } },
      { status: 401 },
    );
  }

  // 1. Verify JWT signature + expiry
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return NextResponse.json(
      { error: { code: "INVALID_REFRESH_TOKEN", message: "Refresh token invalid or expired" } },
      { status: 401 },
    );
  }

  // 2. Look up the hashed token in DB; ensure not revoked
  const stored = await db.refreshToken.findUnique({
    where: { id: payload.jti },
  });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    return NextResponse.json(
      { error: { code: "REVOKED_OR_EXPIRED", message: "Refresh token revoked or expired" } },
      { status: 401 },
    );
  }

  // 3. Compare the raw token against the stored hash
  const matches = await compareRefreshToken(refreshToken, stored.tokenHash);
  if (!matches) {
    return NextResponse.json(
      { error: { code: "TOKEN_MISMATCH", message: "Refresh token hash mismatch" } },
      { status: 401 },
    );
  }

  // 4. Fetch the student to include registerNumber in the new access token
  const student = await db.student.findUnique({
    where: { id: payload.sub },
    select: { id: true, registerNumber: true },
  });
  if (!student) {
    return NextResponse.json(
      { error: { code: "STUDENT_NOT_FOUND", message: "Student no longer exists" } },
      { status: 401 },
    );
  }

  // 5. Issue a fresh access token
  const accessToken = await signAccessToken({
    sub: student.id,
    reg: student.registerNumber,
  });
  const accessTtl = Number(process.env.JWT_ACCESS_TTL ?? 3600);

  cookieStore.set(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: accessTtl,
  });

  return NextResponse.json({ ok: true, expiresIn: accessTtl });
}
