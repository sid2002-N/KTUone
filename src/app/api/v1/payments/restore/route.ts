/**
 * GET /api/v1/payments/restore
 *
 * JWT-protected. Checks whether the authenticated student has a successful
 * supporter purchase and returns their supporter status. Used by the client
 * on app startup to restore the supporter badge without re-running checkout.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedStudent } from "@/lib/auth";
import { checkSupporterStatus } from "@/lib/payments/razorpay-server";
import { db } from "@/lib/db";
import type { SupporterStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedStudent(req);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login required" } },
      { status: 401 },
    );
  }

  try {
    const isSupporter = await checkSupporterStatus(auth.studentId);

    const status: SupporterStatus = {
      isSupporter,
      badge: isSupporter ? "Lifetime Supporter" : null,
    };

    // If supporter, surface the purchase details for the UI.
    if (isSupporter) {
      const purchase = await db.supporterPurchase.findFirst({
        where: { studentId: auth.studentId, status: "Success" },
        orderBy: { purchasedAt: "desc" },
      });
      if (purchase) {
        status.purchasedAt = purchase.purchasedAt.toISOString();
        status.transactionId = purchase.transactionId;
      }
    }

    return NextResponse.json(status);
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          code: "RESTORE_FAILED",
          message: e instanceof Error ? e.message : "Failed to restore purchase",
        },
      },
      { status: 500 },
    );
  }
}
