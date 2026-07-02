"use client";

/**
 * AdMob initializer for Capacitor native builds.
 *
 * Renders nothing visible. Its job is to:
 *   1. Detect whether the app is running inside a Capacitor native shell.
 *   2. If yes + AdMob is the active provider + user is not a supporter,
 *      dynamically import `@capacitor-community/admob`, call
 *      `AdMob.initialize({ initializeForTestingRequests })`, then
 *      `AdMob.showBanner({ adUnitId, adSize, position })`.
 *   3. On unmount or when the user becomes a supporter, call
 *      `AdMob.removeBanner()` to tear down the native banner.
 *
 * The dynamic import is essential — `@capacitor-community/admob` is NOT a
 * dependency of this project today (web-only Next.js). When you wrap the
 * build with Capacitor and `npm install @capacitor-community/admob`, the
 * dynamic import resolves at runtime on native; on web it fails silently
 * inside the try/catch and the placeholder div rendered by <BannerAd />
 * is all that's visible.
 *
 * Activation checklist:
 *   1. Wrap the Next.js build with Capacitor:
 *        npm install @capacitor/core @capacitor/cli @capacitor-community/admob
 *        npx cap init "KTU One" "in.ktuone.app" --web-dir=out
 *        npx cap add android   # and/or ios
 *   2. Add the AdMob plugin to capacitor.config.ts:
 *        const config: CapacitorConfig = {
 *          appId: "in.ktuone.app",
 *          plugins: {
 *            AdMob: { appId: "ca-app-pub-XXXX~XXXX" }
 *          }
 *        };
 *   3. Set env vars:
 *        NEXT_PUBLIC_ADS_PROVIDER=admob
 *        NEXT_PUBLIC_ADMOB_APP_ID=ca-app-pub-XXXX~XXXX
 *        NEXT_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-XXXX/XXXX
 *        (optional) NEXT_PUBLIC_ADMOB_BANNER_SIZE=SMART_BANNER
 *        (optional) NEXT_PUBLIC_ADMOB_POSITION=BOTTOM_CENTER
 *        (optional) NEXT_PUBLIC_ADMOB_ACTIVE_SLOTS=["home-top"]
 *   4. Rebuild + `npx cap sync` + `npx cap open android` (or ios).
 *   5. The native banner appears at the configured position on every screen
 *      where <BannerAd slot="home-top" /> (or another active slot) renders.
 *
 * On web (no Capacitor): the dynamic import fails, the catch block logs a
 * one-time dev warning, and the user sees the placeholder div only. No
 * crash, no broken layout.
 */
import { useEffect, useRef } from "react";
import {
  isAdMobActive,
  getAdMobAppId,
  getAdMobBannerId,
  getAdMobBannerSize,
  getAdMobPosition,
  type AdMobBannerSize,
} from "@/lib/providers/ads";
import { useSupporterStore } from "@/store/supporter-store";

interface CapacitorGlobal {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => "web" | "android" | "ios";
  };
}

function getCapacitorGlobal(): CapacitorGlobal["Capacitor"] | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as CapacitorGlobal).Capacitor;
}

function isCapacitorNative(): boolean {
  const cap = getCapacitorGlobal();
  if (!cap?.isNativePlatform) return false;
  try {
    return cap.isNativePlatform();
  } catch {
    return false;
  }
}

interface AdMobPlugin {
  initialize(opts: { requestTrackingEnabled?: boolean }): Promise<unknown>;
  showBanner(opts: {
    adId: string;
    adSize: AdMobBannerSize;
    position: "TOP_CENTER" | "BOTTOM_CENTER";
  }): Promise<unknown>;
  hideBanner(): Promise<unknown>;
  removeBanner(): Promise<unknown>;
}

let _admobModulePromise: Promise<{ AdMob: AdMobPlugin } | null> | null = null;
let _warnedAboutMissingPackage = false;

/**
 * Dynamically import the AdMob plugin. Resolves to null if the package
 * isn't installed (web-only build). Cached so we only attempt the import
 * once per session.
 */
async function loadAdMobPlugin(): Promise<AdMobPlugin | null> {
  if (!_admobModulePromise) {
    _admobModulePromise = (async () => {
      try {
        const mod = await import("@capacitor-community/admob");
        return { AdMob: (mod as { AdMob: AdMobPlugin }).AdMob };
      } catch {
        if (process.env.NODE_ENV !== "production" && !_warnedAboutMissingPackage) {
          _warnedAboutMissingPackage = true;
          console.warn(
            "[ads] AdMob provider activated but `@capacitor-community/admob` is not installed. " +
              "Run: npm install @capacitor-community/admob  (and `npx cap sync` after).",
          );
        }
        return null;
      }
    })();
  }
  const mod = await _admobModulePromise;
  return mod?.AdMob ?? null;
}

/**
 * <AdMobInitializer /> — mount once near the root of the app (inside <Providers />).
 *
 * Shows the native banner when:
 *   - the active provider is AdMob, AND
 *   - the app is running in a Capacitor native shell, AND
 *   - the user is not a supporter, AND
 *   - NEXT_PUBLIC_ADMOB_BANNER_ID is set
 *
 * Hides + removes the banner on cleanup (unmount / becomes supporter /
 * provider change).
 */
export function AdMobInitializer() {
  const isSupporter = useSupporterStore((s) => s.isSupporter);
  const bannerShownRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function show() {
      if (isSupporter) return;
      if (!isAdMobActive()) return;
      if (!isCapacitorNative()) return; // web-only build — placeholder only
      const bannerId = getAdMobBannerId();
      if (!bannerId) return;
      const appId = getAdMobAppId();
      if (!appId) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[ads] AdMob active but NEXT_PUBLIC_ADMOB_APP_ID is not set.");
        }
        return;
      }

      const admob = await loadAdMobPlugin();
      if (!admob || cancelled) return;

      try {
        await admob.initialize({ requestTrackingEnabled: false });
        await admob.showBanner({
          adId: bannerId,
          adSize: getAdMobBannerSize(),
          position: getAdMobPosition(),
        });
        bannerShownRef.current = true;
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[ads] AdMob showBanner failed:", e);
        }
      }
    }

    async function hide() {
      if (!bannerShownRef.current) return;
      const admob = await loadAdMobPlugin();
      if (!admob) return;
      try {
        await admob.hideBanner();
        await admob.removeBanner();
      } catch {
        /* swallow — banner may already be removed */
      }
      bannerShownRef.current = false;
    }

    void show();

    return () => {
      cancelled = true;
      void hide();
    };
  }, [isSupporter]);

  return null;
}
