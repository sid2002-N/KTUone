/**
 * PaymentProvider — abstracts the supporter purchase flow.
 *
 * The default implementation is RazorpayPaymentProvider (talks to
 * /api/v1/payments/create-order + /api/v1/payments/verify via the BFF, opens
 * the Razorpay checkout modal). For tests or platform variants, swap with
 * `__setPaymentProvider`.
 *
 * Pages only call PaymentProvider.initiatePurchase() — never Razorpay directly.
 */

import type { PaymentProvider as ProviderName, SupporterPurchase } from "@/lib/types";
import { RazorpayPaymentProvider } from "@/lib/providers/payment-razorpay";

export interface InitiatePurchaseInput {
  studentId?: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

export interface InitiatePurchaseResult {
  purchaseId: string;
  status: SupporterPurchase["status"];
  provider: ProviderName;
  transactionId: string;
  receiptUrl?: string;
}

export interface PaymentProvider {
  readonly name: ProviderName;
  initiatePurchase(input: InitiatePurchaseInput): Promise<InitiatePurchaseResult>;
  verifyPurchase(purchaseId: string): Promise<SupporterPurchase>;
  restorePurchase(studentId?: string): Promise<SupporterPurchase | null>;
  cancelPurchase?(purchaseId: string): Promise<void>;
}

let _instance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!_instance) _instance = new RazorpayPaymentProvider();
  return _instance;
}

export function __setPaymentProvider(p: PaymentProvider) {
  _instance = p;
}
