/**
 * POST /api/v1/payments/verify
 *
 * JWT-protected. Verifies a Razorpay payment signature (HMAC-SHA256 +
 * timing-safe compare) and marks the matching SupporterPurchase as Success.
 *
 * Body: { orderId, paymentId, signature }
 *
 * Returns: { ok: true } on success, 400 on signature mismatch.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedStudent } from "@/lib/auth";
import {
  verifyPaymentSignature,
  markPurchaseSuccess,
} from "@/lib/payments/razorpay-server";

export const dynamic = "force-dynamic";

const VerifySchema = z.object({
  orderId: z.string().min(1).max(100),
  paymentId: z.string().min(1).max(100),
  signature: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedStudent(req);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login required" } },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: parsed.error.issues[0]?.message ?? "Invalid input",
        },
      },
      { status: 400 },
    );
  }

  const { orderId, paymentId, signature } = parsed.data;

  try {
    const valid = verifyPaymentSignature(orderId, paymentId, signature);
    if (!valid) {
      return NextResponse.json(
        { error: { code: "SIGNATURE_MISMATCH", message: "Payment signature could not be verified" } },
        { status: 400 },
      );
    }

    const result = await markPurchaseSuccess(orderId, paymentId);

    // Defense-in-depth: the pending purchase was created by the authenticated
    // student. If the verified payment's studentId doesn't match the caller,
    // refuse — this prevents a malicious student from verifying someone else's
    // payment to gain supporter status on their own account.
    if (result.studentId && result.studentId !== auth.studentId) {
      return NextResponse.json(
        { error: { code: "STUDENT_MISMATCH", message: "Payment does not belong to caller" } },
        { status: 403 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          code: "VERIFY_FAILED",
          message: e instanceof Error ? e.message : "Verification failed",
        },
      },
      { status: 500 },
    );
  }
}
