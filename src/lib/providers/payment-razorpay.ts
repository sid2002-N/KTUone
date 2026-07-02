/**
 * Razorpay client-side payment provider.
 *
 * Implements the PaymentProvider interface from @/lib/providers/payment so
 * the UI can swap providers without touching page code.
 *
 * Flow:
 *   1. initiatePurchase(input):
 *        - POST /api/v1/payments/create-order via authedFetch
 *        - load https://checkout.razorpay.com/v1/checkout.js
 *        - open the Razorpay modal with the returned order id
 *        - on success, POST /api/v1/payments/verify via authedFetch
 *        - return { purchaseId, status, provider, transactionId }
 *   2. restorePurchase(studentId?):
 *        - POST /api/v1/payments/restore via authedFetch
 *        - returns existing purchase or null
 *
 * Verification is server-side — verifyPurchase() throws on the client because
 * it requires the RAZORPAY_KEY_SECRET.
 */
"use client";

import type {
  PaymentProvider as ProviderName,
  SupporterPurchase,
} from "@/lib/types";
import type {
  InitiatePurchaseInput,
  InitiatePurchaseResult,
  PaymentProvider,
} from "@/lib/providers/payment";
import { authedFetch } from "@/lib/providers/authed-fetch";

/* ---------- Razorpay script + global typing ---------- */

interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number; // paise
  currency: string;
  name?: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpayHandlerResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
  on?(event: string, handler: (response: unknown) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let _scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  if (_scriptPromise) return _scriptPromise;

  _scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Razorpay checkout script"));
    document.body.appendChild(script);
  });
  return _scriptPromise;
}

/* ---------- API response shapes ---------- */

interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  purchaseId: string;
  keyId: string;
}

interface VerifyResponse {
  purchaseId: string;
  status: SupporterPurchase["status"];
  transactionId: string;
  receiptUrl?: string;
}

interface RestoreResponse {
  purchase: SupporterPurchase | null;
}

/* ---------- Provider ---------- */

export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name: ProviderName = "Razorpay";

  async initiatePurchase(
    input: InitiatePurchaseInput,
  ): Promise<InitiatePurchaseResult> {
    // 1. Create order via BFF (server creates Razorpay order + pending purchase)
    const createRes = await authedFetch("/api/v1/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: input.studentId,
        amount: input.amount,
        currency: input.currency,
        metadata: input.metadata,
      }),
    });
    if (!createRes.ok) {
      throw new Error(`create-order failed: ${createRes.status}`);
    }
    const order = (await createRes.json()) as CreateOrderResponse;

    // 2. Load the Razorpay checkout script
    await loadRazorpayScript();
    const RazorpayCtor = window.Razorpay;
    if (!RazorpayCtor) {
      throw new Error("Razorpay SDK failed to initialize");
    }

    // 3. Open the modal and await the handler / dismiss
    const paymentResult = await new Promise<RazorpayHandlerResponse>(
      (resolve, reject) => {
        const rz = new RazorpayCtor({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "KTU One Supporter",
          description: "Lifetime Supporter Badge",
          order_id: order.orderId,
          handler: (resp) => resolve(resp),
          modal: {
            ondismiss: () => reject(new Error("PAYMENT_CANCELLED")),
          },
          theme: { color: "#9333EA" },
        });
        rz.open();
      },
    );

    // 4. Verify the signature server-side
    const verifyRes = await authedFetch("/api/v1/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purchaseId: order.purchaseId,
        orderId: paymentResult.razorpay_order_id,
        paymentId: paymentResult.razorpay_payment_id,
        signature: paymentResult.razorpay_signature,
      }),
    });
    if (!verifyRes.ok) {
      throw new Error(`payment verify failed: ${verifyRes.status}`);
    }
    const verified = (await verifyRes.json()) as VerifyResponse;

    return {
      purchaseId: verified.purchaseId,
      status: verified.status,
      provider: "Razorpay",
      transactionId: verified.transactionId,
      receiptUrl: verified.receiptUrl,
    };
  }

  /**
   * Verification happens server-side during initiatePurchase and via the
   * Razorpay webhook. Calling this on the client would leak the key secret.
   */
  verifyPurchase(_purchaseId: string): Promise<SupporterPurchase> {
    return Promise.reject(
      new Error(
        "verifyPurchase is server-only — handled inside initiatePurchase via /api/v1/payments/verify",
      ),
    );
  }

  async restorePurchase(
    studentId?: string,
  ): Promise<SupporterPurchase | null> {
    const res = await authedFetch("/api/v1/payments/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as RestoreResponse;
    return data.purchase ?? null;
  }
}
