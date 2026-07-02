/**
 * Ambient type declaration for the optional `@capacitor-community/admob`
 * plugin.
 *
 * This file lets TypeScript compile cleanly whether or not the package is
 * installed. When the Capacitor build is set up and the package is added
 * (`npm install @capacitor-community/admob`), the real types from the
 * package take precedence over this ambient declaration (TS picks the
 * real `.d.ts` files in node_modules over wildcard module declarations).
 *
 * The shapes here mirror the plugin's public API surface as of v5.x —
 * `initialize`, `showBanner`, `hideBanner`, `removeBanner`. If the plugin
 * adds new methods later, the real installed types will replace this file.
 */

declare module "@capacitor-community/admob" {
  export type BannerAdSize =
    | "BANNER"
    | "LARGE_BANNER"
    | "MEDIUM_RECTANGLE"
    | "FULL_BANNER"
    | "LEADERBOARD"
    | "SMART_BANNER";

  export type BannerAdPosition =
    | "TOP_CENTER"
    | "TOP_LEFT"
    | "TOP_RIGHT"
    | "CENTER"
    | "BOTTOM_CENTER"
    | "BOTTOM_LEFT"
    | "BOTTOM_RIGHT";

  export interface AdMobInitializeOptions {
    requestTrackingEnabled?: boolean;
    initializeForTestingRequests?: boolean;
  }

  export interface ShowBannerOptions {
    adId: string;
    adSize: BannerAdSize;
    position: BannerAdPosition;
  }

  export interface AdMobPlugin {
    initialize(opts: AdMobInitializeOptions): Promise<void>;
    showBanner(opts: ShowBannerOptions): Promise<void>;
    hideBanner(): Promise<void>;
    resumeBanner(): Promise<void>;
    removeBanner(): Promise<void>;
  }

  export const AdMob: AdMobPlugin;
}
