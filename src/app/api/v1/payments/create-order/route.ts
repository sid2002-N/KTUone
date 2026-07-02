/**
 * POST /api/v1/payments/create-order
 *
 * JWT-protected (via `getAuthenticatedStudent`). Creates a Razorpay order for
 * a ₹99 supporter purchase, persists a `Pending` SupporterPurchase row keyed
 * by the Razorpay order id, and returns the order details + Razorpay publishable
 * key id so the client can open the Razorpay checkout modal.
 *
 * Body: none (uses the authenticated student's identity).
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedStudent } from "@/lib/auth";
import { createOrder } from "@/lib/payments/razorpay-server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedStudent(req);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login required to become a supporter" } },
      { status: 401 },
    );
  }

  // Look up the student's register number (the access token only has the id
  // and a cached reg — we want the source-of-truth from the DB so the receipt
  // note is correct even if the token's reg is stale).
  const student = await db.student.findUnique({
    where: { id: auth.studentId },
    select: { registerNumber: true },
  });
  if (!student) {
    return NextResponse.json(
      { error: { code: "STUDENT_NOT_FOUND", message: "Student record not found" } },
      { status: 404 },
    );
  }

  try {
    const order = await createOrder(auth.studentId, student.registerNumber);
    return NextResponse.json(order);
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          code: "ORDER_CREATE_FAILED",
          message: e instanceof Error ? e.message : "Failed to create order",
        },
      },
      { status: 500 },
    );
  }
}
