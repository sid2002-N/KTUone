/**
 * Razorpay server-side payment helper.
 *
 * Server-only — uses the `razorpay` npm package, `crypto`, and Prisma.
 *
 * Lifecycle:
 *   1. createOrder(studentId, registerNumber)
 *        - creates a Razorpay order for ₹99 (9900 paise)
 *        - persists a `Pending` SupporterPurchase row keyed by order id
 *        - returns { orderId, amount, currency, purchaseId, keyId }
 *   2. verifyPaymentSignature(orderId, paymentId, signature)
 *        - HMAC-SHA256 verification (timing-safe compare)
 *   3. markPurchaseSuccess(orderId, paymentId)
 *        - flips the purchase status to `Success`, returns { studentId }
 *   4. checkSupporterStatus(studentId)
 *        - returns true if student has any `Success` purchase
 *
 * Env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 */
import Razorpay from "razorpay";
import crypto from "crypto";
import { db } from "@/lib/db";

const SUPPORTER_AMOUNT_PAISE = 9900; // ₹99.00

function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error(
      "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET env vars not configured",
    );
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export interface CreateOrderResult {
  orderId: string;
  amount: number; // paise
  currency: string;
  purchaseId: string;
  keyId: string;
}

/**
 * Create a Razorpay order and a matching pending SupporterPurchase row.
 */
export async function createOrder(
  studentId: string,
  registerNumber: string,
): Promise<CreateOrderResult> {
  const rzp = getRazorpayClient();
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) throw new Error("RAZORPAY_KEY_ID env var not configured");

  const order = await rzp.orders.create({
    amount: SUPPORTER_AMOUNT_PAISE,
    currency: "INR",
    receipt: `supporter-${registerNumber}-${Date.now()}`,
    notes: { studentId, registerNumber },
  });

  if (!order.id) {
    throw new Error("Razorpay order creation failed — no order id returned");
  }

  const purchase = await db.supporterPurchase.create({
    data: {
      studentId,
      amount: SUPPORTER_AMOUNT_PAISE,
      currency: "INR",
      status: "Pending",
      provider: "Razorpay",
      transactionId: order.id, // order id while Pending — replaced by paymentId on success
    },
  });

  return {
    orderId: order.id,
    amount: Number(order.amount ?? SUPPORTER_AMOUNT_PAISE),
    currency: order.currency ?? "INR",
    purchaseId: purchase.id,
    keyId,
  };
}

/**
 * Verify a Razorpay payment signature using HMAC-SHA256.
 *
 * Razorpay signs `<orderId>|<paymentId>` with the key secret. We compare the
 * received signature against the computed digest using a timing-safe compare
 * to prevent timing attacks.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET env var not configured");

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Mark a pending purchase as successful.
 *
 * Looks up the purchase by its stored `transactionId` (the Razorpay order id
 * set in createOrder), flips status to Success, and stores the verified
 * payment id as the final transactionId.
 */
export async function markPurchaseSuccess(
  orderId: string,
  paymentId: string,
): Promise<{ studentId: string | null }> {
  const purchase = await db.supporterPurchase.findFirst({
    where: { transactionId: orderId },
  });
  if (!purchase) {
    throw new Error(`No pending purchase found for orderId=${orderId}`);
  }
  await db.supporterPurchase.update({
    where: { id: purchase.id },
    data: {
      status: "Success",
      transactionId: paymentId, // final verified payment id
      purchasedAt: new Date(),
    },
  });
  return { studentId: purchase.studentId };
}

/**
 * Check whether a student has a successful supporter purchase.
 */
export async function checkSupporterStatus(
  studentId: string,
): Promise<boolean> {
  const count = await db.supporterPurchase.count({
    where: { studentId, status: "Success" },
  });
  return count > 0;
}
