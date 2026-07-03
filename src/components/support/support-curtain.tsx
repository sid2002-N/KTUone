"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Heart, Sparkles, X, Check } from "lucide-react";
import { useNavStore } from "@/store/nav-store";
import { useSupporterStore } from "@/store/supporter-store";
import { getPaymentProvider } from "@/lib/providers/payment";
import { getNotificationProvider } from "@/lib/providers/notification";
import { getAnalyticsProvider } from "@/lib/providers/analytics";
import { SUPPORTER_PRICE_INR } from "@/lib/constants";
import { hapticSync } from "@/lib/utils/haptics";

const benefits = [
  { title: "Remove ads forever", subtitle: "Banner ads gone, on every device." },
  { title: "Lifetime Supporter Badge", subtitle: "A small mark next to your name." },
  { title: "Help future development", subtitle: "Fund faster PDFs, search & AI Tutor." },
  { title: "Priority feature requests", subtitle: "Vote on what we build next." },
];

export function SupportCurtain() {
  const open = useNavStore((s) => s.supportOpen);
  const setOpen = useNavStore((s) => s.setSupportOpen);
  const markSupporter = useSupporterStore((s) => s.markSupporter);
  const prefersReduced = useReducedMotion();
  const [purchasing, setPurchasing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Reset state when reopened
  useEffect(() => {
    if (open) {
      setSuccess(false);
      setError(null);
      setPurchasing(false);
    }
  }, [open]);

  // Esc key closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !purchasing) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen, purchasing]);

  const handlePurchase = async () => {
    hapticSync("medium");
    setPurchasing(true);
    setError(null);
    getAnalyticsProvider().track({ name: "supporter_purchase_started", props: {} });
    try {
      const result = await getPaymentProvider().initiatePurchase({
        amount: SUPPORTER_PRICE_INR,
        currency: "INR",
      });
      if (result.status === "Success") {
        hapticSync("success");
        markSupporter(result.transactionId, new Date().toISOString());
        setSuccess(true);
        getAnalyticsProvider().track({
          name: "supporter_purchase_succeeded",
          props: { transactionId: result.transactionId },
        });
        getNotificationProvider().show({
          kind: "success",
          title: "Welcome to KTU One Supporters",
          message: "Ads are gone. Thanks for keeping this alive.",
        });
        setTimeout(() => setOpen(false), 2200);
      } else {
        throw new Error("Payment did not succeed.");
      }
    } catch (e) {
      hapticSync("error");
      const message = e instanceof Error ? e.message : "Payment failed. Try again.";
      setError(message);
      getAnalyticsProvider().track({
        name: "supporter_purchase_failed",
        props: { reason: message },
      });
    } finally {
      setPurchasing(false);
    }
  };

  const curtainVariants = {
    hidden: { y: "-100%", opacity: 0 },
    visible: prefersReduced
      ? { y: "0%", opacity: 1 }
      : {
          y: "0%",
          opacity: 1,
          transition: {
            type: "spring" as const,
            stiffness: 220,
            damping: 28,
            mass: 0.9,
          },
        },
    exit: prefersReduced
      ? { y: "-100%", opacity: 0 }
      : {
          y: "-100%",
          opacity: 0,
          transition: {
            type: "spring" as const,
            stiffness: 260,
            damping: 30,
          },
        },
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          {/* Dimmed backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => !purchasing && setOpen(false)}
          />

          {/* Curtain panel — slides from top */}
          <motion.div
            className="absolute left-0 right-0 top-0 h-[85vh] mx-auto"
            variants={curtainVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div
              className="h-full rounded-b-[24px] overflow-hidden flex flex-col"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, rgba(255,255,255,0.03) 100%), var(--card)",
                backdropFilter: "blur(40px) saturate(200%)",
                WebkitBackdropFilter: "blur(40px) saturate(200%)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
              }}
            >
              {/* Top handle */}
              <div className="pt-3 pb-1 flex justify-center">
                <div className="w-10 h-1.5 rounded-full bg-foreground/15" />
              </div>

              <div className="flex-1 overflow-y-auto px-6 sm:px-10 pb-6 pt-2 max-w-2xl w-full mx-auto">
                {!success ? (
                  <>
                    <div className="text-center mt-2">
                      <div className="inline-flex items-center justify-center size-16 rounded-2xl mb-4"
                        style={{
                          background: "rgba(212,148,58,0.1)",
                          border: "1px solid rgba(212,148,58,0.2)",
                        }}
                      >
                        <Heart className="size-8 text-primary" fill="currentColor" />
                      </div>
                      <h2 className="section-title text-3xl">
                        Support KTU One
                      </h2>
                      <p className="mt-3 text-muted-foreground leading-relaxed text-[14px]">
                        KTU One is free for every student.
                        <br />
                        Your support helps keep the app alive and updated.
                      </p>
                    </div>

                    <div className="mt-8 space-y-3">
                      <p className="section-eyebrow px-1">Benefits</p>
                      {benefits.map((b) => (
                        <div
                          key={b.title}
                          className="card p-4 flex items-start gap-3"
                        >
                          <div
                            className="size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                              background: "rgba(212,148,58,0.1)",
                              border: "1px solid rgba(212,148,58,0.2)",
                            }}
                          >
                            <Check className="size-4 text-primary" strokeWidth={3} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{b.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{b.subtitle}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Price card */}
                    <div
                      className="mt-8 p-5 rounded-2xl text-center"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(212,148,58,0.12) 0%, rgba(212,148,58,0.04) 100%)",
                        border: "1px solid rgba(212,148,58,0.2)",
                      }}
                    >
                      <p className="text-xs uppercase tracking-widest font-semibold text-primary">
                        One-time price
                      </p>
                      <p className="section-title text-4xl mt-1">
                        ₹{SUPPORTER_PRICE_INR}
                        <span className="text-base font-medium text-muted-foreground ml-2">Lifetime</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Not a subscription. Pay once, keep forever.
                      </p>
                    </div>

                    {error && (
                      <div className="mt-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
                        {error}
                      </div>
                    )}

                    <div className="mt-6 space-y-3">
                      <button
                        onClick={handlePurchase}
                        disabled={purchasing}
                        className="btn-primary w-full py-3.5 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {purchasing ? (
                          <>
                            <span className="size-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Heart className="size-4" fill="currentColor" />
                            Become a Supporter
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          hapticSync("light");
                          setOpen(false);
                        }}
                        disabled={purchasing}
                        className="btn-ghost w-full py-3 rounded-[10px] font-medium disabled:opacity-50"
                      >
                        Maybe later
                      </button>
                    </div>

                    <p className="mt-5 text-center text-[11px] text-muted-foreground leading-relaxed">
                      Payments are securely processed by Razorpay. Your support is non-refundable
                      unless required by law. KTU One is an independent project,
                      not affiliated with APJ Abdul Kalam Technological University.
                    </p>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="h-full flex flex-col items-center justify-center text-center"
                  >
                    <motion.div
                      initial={prefersReduced ? {} : { scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                      className="size-24 rounded-full flex items-center justify-center mb-6"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(212,148,58,0.15) 0%, rgba(212,148,58,0.05) 100%)",
                        border: "1px solid rgba(212,148,58,0.25)",
                      }}
                    >
                      <Sparkles className="size-12 text-primary" />
                    </motion.div>
                    <h2 className="section-title text-3xl">
                      You&apos;re a Supporter
                    </h2>
                    <p className="mt-3 text-muted-foreground max-w-sm text-[14px]">
                      Welcome aboard. Ads are gone forever — and you just helped
                      every KTU student get a better app.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Floating circular X */}
          <motion.button
            onClick={() => !purchasing && setOpen(false)}
            aria-label="Close support curtain"
            className="absolute left-1/2 -translate-x-1/2 z-[101] size-14 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform no-tap-highlight"
            style={{
              top: "calc(85vh - 28px)",
              background: "var(--card)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            disabled={purchasing}
          >
            <X className="size-6" />
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  );
}
