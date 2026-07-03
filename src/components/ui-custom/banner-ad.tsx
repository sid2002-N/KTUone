"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { getAdsProvider } from "@/lib/providers/ads";
import type { AdSlot, AdDescriptor } from "@/lib/providers/ads";
import { useSupporterStore } from "@/store/supporter-store";
import { useNavStore } from "@/store/nav-store";
import { cn } from "@/lib/utils";

interface BannerAdProps {
  slot: AdSlot;
  className?: string;
}

/**
 * <BannerAd /> — the only ad component pages may render.
 * Pulls a descriptor from AdsProvider and renders the appropriate UI based
 * on `ad.render`:
 *
 *   - "banner" → in-house promotional CTA (default; safe to ship anytime)
 *   - "adsense" → `<ins class="adsbygoogle">` element; the AdSense script
 *                 (loaded by <AdSenseScript />) fills it with a real ad
 *   - "admob"   → placeholder div reserving layout space; the actual native
 *                 banner is rendered by <AdMobInitializer /> on Capacitor
 *   - "none"    → renders nothing (kill switch or unconfigured slot)
 *
 * Pages never import ad SDKs.
 */
export function BannerAd({ slot, className }: BannerAdProps) {
  const isSupporter = useSupporterStore((s) => s.isSupporter);
  const setSupportOpen = useNavStore((s) => s.setSupportOpen);
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  const ad = useMemo(() => getAdsProvider().getAd(slot), [slot]);
  const showAd = !isSupporter && getAdsProvider().isEnabled();

  if (!showAd) {
    // Supporters see a tiny "supporter" ribbon instead of an ad.
    return (
      <div
        className={cn(
          "glass rounded-2xl px-5 py-3 flex items-center justify-between gap-3",
          className,
        )}
      >
        <div className="flex items-center gap-2.5 text-sm">
          <Sparkles className="size-4 text-primary" />
          <span className="font-medium text-foreground">
            Ad-free experience
          </span>
          <span className="text-muted-foreground text-xs">
            — Thanks for being a Supporter 💜
          </span>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
          Lifetime
        </span>
      </div>
    );
  }

  if (ad.render === "none") {
    // Provider configured this slot as no-op (e.g. AdSense slot not in the
    // env map, or NoAdsProvider). Render nothing — no layout shift because
    // height is 0.
    return null;
  }

  if (ad.render === "adsense") {
    return <AdSenseAd ad={ad} className={className} />;
  }

  if (ad.render === "admob") {
    return <AdMobPlaceholder ad={ad} className={className} />;
  }

  // Default: in-house promotional banner
  return (
    <motion.div
      initial={mounted && !prefersReduced ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "glass rounded-2xl overflow-hidden relative",
        className,
      )}
      style={{ minHeight: ad.height }}
      role="complementary"
      aria-label="Sponsored content"
    >
      <div className="absolute top-2 right-3 text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">
        Ad
      </div>
      <div className="h-full flex flex-col items-center justify-center text-center px-6 py-4">
        <div className="text-xs text-muted-foreground mb-1">{ad.label}</div>
        <div className="text-sm font-medium text-foreground">
          Your banner could be here
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Respectful, non-intrusive advertising · Free users only
        </div>
        <button
          onClick={() => setSupportOpen(true)}
          className="mt-2 text-xs text-primary hover:underline font-medium"
        >
          Go ad-free for ₹99 →
        </button>
      </div>
    </motion.div>
  );
}

/* ===================================================================== */
/* AdSense — `<ins class="adsbygoogle">` element                         */
/* ===================================================================== */

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function AdSenseAd({ ad, className }: { ad: AdDescriptor; className?: string }) {
  // Push to the adsbygoogle queue ONCE after the <ins> mounts. Re-pushing
  // would cause AdSense to log "already filled" warnings.
  const pushedRef = useRef(false);

  useEffect(() => {
    if (pushedRef.current) return;
    if (typeof window === "undefined") return;
    if (!ad.adClient || !ad.adSlot) return;

    // The AdSense script (loaded by <AdSenseScript />) reads entries from
    // this queue and fills the matching <ins> element. If the script hasn't
    // loaded yet (e.g. slow network), the push queues and is processed when
    // the script arrives.
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      /* swallow — AdSense will retry on next render */
    }
  }, [ad.adClient, ad.adSlot]);

  return (
    <div
      className={cn("adsense-container rounded-2xl overflow-hidden", className)}
      style={{ minHeight: ad.height }}
      role="complementary"
      aria-label="Advertisement"
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: ad.height }}
        data-ad-client={ad.adClient}
        data-ad-slot={ad.adSlot}
        data-ad-format={ad.adFormat ?? "auto"}
        data-full-width-responsive={ad.fullWidthResponsive ? "true" : "false"}
      />
    </div>
  );
}

/* ===================================================================== */
/* AdMob — layout placeholder (native banner shown by <AdMobInitializer />) */
/* ===================================================================== */

function AdMobPlaceholder({ ad, className }: { ad: AdDescriptor; className?: string }) {
  // The native banner is overlaid by <AdMobInitializer />. This div just
  // reserves the same vertical space so content below doesn't shift when
  // the banner appears.
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border/40 bg-muted/20 flex items-center justify-center",
        className,
      )}
      style={{ minHeight: ad.height }}
      role="complementary"
      aria-label="Advertisement"
      data-admob-slot={ad.slot}
      data-admob-size={ad.adSize}
      data-admob-adunit={ad.adUnitId}
    >
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
        Ad
      </span>
    </div>
  );
}
