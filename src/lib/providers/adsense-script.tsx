"use client";

/**
 * AdSense script loader.
 *
 * Renders nothing visible. Its only job is to inject the
 * `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js` script
 * tag into <head> ONCE per app load — but ONLY when the active AdsProvider
 * is AdSense AND ads are enabled (i.e. user is not a supporter).
 *
 * Mounting is conditional from <Providers /> so the script tag is never
 * even added to the DOM when ads are off. This keeps the bundle clean and
 * avoids the AdSense crawler indexing your site before approval.
 *
 * Activation checklist:
 *   1. Get Google AdSense approval for your domain.
 *   2. Set env vars:
 *        NEXT_PUBLIC_ADS_PROVIDER=adsense
 *        NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
 *        NEXT_PUBLIC_ADSENSE_SLOTS={"home-top":"1234567890","papers-list":"0987654321",...}
 *   3. Redeploy. <AdSenseScript /> will pick up the env var on first render
 *      and load the script; <BannerAd /> instances will start rendering
 *      <ins class="adsbygoogle"> elements that the script fills.
 */
import { useEffect } from "react";
import { isAdSenseActive, getAdSenseClientId } from "@/lib/providers/ads";
import { useSupporterStore } from "@/store/supporter-store";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let _scriptLoaded = false;

/**
 * Inject the AdSense script tag once. Safe to call multiple times —
 * subsequent calls are no-ops once the script is in the DOM.
 */
function loadAdSenseScript(adClient: string): void {
  if (typeof document === "undefined") return; // SSR guard
  if (_scriptLoaded) return;
  if (document.getElementById("adsbygoogle-script")) {
    _scriptLoaded = true;
    return;
  }

  const s = document.createElement("script");
  s.id = "adsbygoogle-script";
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`;
  s.crossOrigin = "anonymous";
  // head is always present in app layouts — cast to satisfy TS without
  // pulling in next/head (deprecated in app router).
  document.head.appendChild(s);
  _scriptLoaded = true;
}

/**
 * <AdSenseScript /> — mount once near the root of the app (inside <Providers />).
 *
 * Self-disables when:
 *   - the active provider is not AdSense, OR
 *   - the user is a supporter, OR
 *   - NEXT_PUBLIC_ADSENSE_CLIENT_ID is not configured
 *
 * Renders null in all cases — it's a side-effect-only component.
 */
export function AdSenseScript() {
  const isSupporter = useSupporterStore((s) => s.isSupporter);

  useEffect(() => {
    if (isSupporter) return;
    if (!isAdSenseActive()) return;
    const clientId = getAdSenseClientId();
    if (!clientId) return;
    loadAdSenseScript(clientId);
  }, [isSupporter]);

  return null;
}

/**
 * Hook version — call from inside any component that needs the AdSense
 * script loaded before pushing to the adsbygoogle queue. Ensures the
 * script is present even if <AdSenseScript /> wasn't mounted (defence in
 * depth).
 */
export function useAdSenseScript(): void {
  const isSupporter = useSupporterStore((s) => s.isSupporter);

  useEffect(() => {
    if (isSupporter) return;
    if (!isAdSenseActive()) return;
    const clientId = getAdSenseClientId();
    if (!clientId) return;
    loadAdSenseScript(clientId);
  }, [isSupporter]);
}
