/**
 * POST /api/webhooks/razorpay
 *
 * Razorpay webhook receiver. Verifies the webhook signature using
 * `crypto.timingSafeEqual` (defense against timing attacks), then handles the
 * `payment.captured` event by marking the matching SupporterPurchase as
 * Success.
 *
 * Auth: signature verification only — Razorpay servers call this endpoint
 * directly with no JWT cookie. The middleware matcher (`/api/v1/:path*`) does
 * NOT run on this route (it lives under `/api/webhooks/*`), so it bypasses the
 * student-JWT check entirely.
 *
 * Env vars: RAZORPAY_WEBHOOK_SECRET
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { markPurchaseSuccess } from "@/lib/payments/razorpay-server";

export const dynamic = "force-dynamic";

interface RazorpayWebhookEvent {
  entity?: string;
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        status?: string;
      };
    };
  };
}

/**
 * Verify the webhook signature.
 *
 * Razorpay computes `HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)` and sends
 * the hex digest in the `X-Razorpay-Signature` header. We recompute the
 * digest over the exact raw request body and compare using
 * `crypto.timingSafeEqual`.
 */
function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET env var not configured");
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signatureHeader, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    // Bad hex from Razorpay — treat as invalid signature.
    return false;
  }
}

export async function POST(req: NextRequest) {
  // 1. Read the raw body — Razorpay signs the exact bytes, so we can't use
  //    req.json() before verifying (that would re-serialize and break the
  //    signature).
  const rawBody = await req.text();

  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!signature) {
    return NextResponse.json(
      { error: { code: "MISSING_SIGNATURE", message: "No X-Razorpay-Signature header" } },
      { status: 400 },
    );
  }

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: { code: "INVALID_SIGNATURE", message: "Webhook signature verification failed" } },
      { status: 401 },
    );
  }

  // 2. Parse the verified body.
  let payload: RazorpayWebhookEvent;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const eventType = payload.event ?? "";
  const paymentEntity = payload.payload?.payment?.entity;

  // 3. Handle payment.captured — this is the canonical "money landed" event
  //    for Razorpay domestic UPI/card payments.
  if (eventType === "payment.captured" && paymentEntity) {
    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;
    if (!orderId || !paymentId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Missing order_id or payment id in payload" } },
        { status: 400 },
      );
    }

    try {
      await markPurchaseSuccess(orderId, paymentId);
      return NextResponse.json({ ok: true, handled: eventType });
    } catch (e) {
      // Likely "no pending purchase found for orderId" — log and 200 anyway so
      // Razorpay doesn't keep retrying. Idempotency: if the webhook already
      // fired and the purchase was already marked Success, this is fine.
      console.error("razorpay webhook markPurchaseSuccess failed:", e);
      return NextResponse.json(
        { ok: true, handled: eventType, note: "no-op or already-processed" },
      );
    }
  }

  // 4. Unhandled event type — acknowledge so Razorpay doesn't retry.
  return NextResponse.json({ ok: true, handled: null, event: eventType });
}
