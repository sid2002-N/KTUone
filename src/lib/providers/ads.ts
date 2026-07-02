/**
 * AdsProvider — abstracts ad serving across platforms.
 *
 * Three production-grade providers ship in this file:
 *
 *   1. BannerAdsProvider (default)
 *      In-house promotional CTAs for free users. No third-party SDK. Always
 *      safe to ship; this is what's rendered until you flip the env var.
 *
 *   2. AdSenseAdsProvider (web — Google AdSense)
 *      Activated when NEXT_PUBLIC_ADS_PROVIDER=adsense. Renders
 *      `<ins class="adsbygoogle">` elements; the script is loaded lazily by
 *      <AdSenseScript /> (see adsense-script.tsx) so the network request is
 *      only made when ads are actually turned on.
 *
 *   3. AdMobAdsProvider (Capacitor native — Google AdMob)
 *      Activated when NEXT_PUBLIC_ADS_PROVIDER=admob. Returns descriptors
 *      that <BannerAd /> renders as placeholder divs (reserving layout
 *      space); the actual native banner is shown by <AdMobInitializer />
 *      (see admob-initializer.tsx) via dynamic import of
 *      `@capacitor-community/admob`. The dynamic import means the package
 *      is NOT a hard dependency — it's only required when AdMob is activated
 *      on a Capacitor build.
 *
 *   4. NoAdsProvider
 *      Activated when NEXT_PUBLIC_ADS_PROVIDER=none. Returns render="none"
 *      for every slot — useful as a kill switch if you need to disable all
 *      ads (including in-house promos) without code changes.
 *
 * Selection is automatic via env var at module load time. The selected
 * provider is cached as a singleton; swap it at runtime with
 * `__setAdsProvider` (tests / future admin-toggle feature).
 *
 * Pages only render <BannerAd />. They never know which provider is active.
 */

export type AdSlot =
  | "home-top"
  | "home-mid"
  | "papers-list"
  | "syllabus-list"
  | "notices-list"
  | "settings-top";

export type AdRenderMode = "banner" | "adsense" | "admob" | "none";

/** AdMob banner size — mirrors @capacitor-community/admob's BannerAdSize enum. */
export type AdMobBannerSize =
  | "BANNER"
  | "LARGE_BANNER"
  | "MEDIUM_RECTANGLE"
  | "FULL_BANNER"
  | "LEADERBOARD"
  | "SMART_BANNER";

export interface AdDescriptor {
  slot: AdSlot;
  render: AdRenderMode;
  height: number; // px — reserved layout space
  label: string;

  /** AdSense — ca-pub-XXXXXXXXXXXXXXXX. Present only when render === "adsense". */
  adClient?: string;
  /** AdSense — numeric slot ID from the AdSense dashboard. */
  adSlot?: string;
  /** AdSense — optional layout: "auto" | "horizontal" | "vertical" | "rectangle". */
  adFormat?: "auto" | "horizontal" | "vertical" | "rectangle";
  /** AdSense — full-width responsive flag. */
  fullWidthResponsive?: boolean;

  /** AdMob — ad unit ID (ca-app-pub-XXXX/XXXX). Present only when render === "admob". */
  adUnitId?: string;
  /** AdMob — banner size. */
  adSize?: AdMobBannerSize;
}

export interface AdsProvider {
  /** Provider name for analytics / debugging. */
  readonly name: "banner" | "adsense" | "admob" | "none";

  /** Whether ads should be shown (false if supporter, env flag, etc.) */
  isEnabled(): boolean;

  /** Disable ads (e.g. user just became supporter). */
  setEnabled(enabled: boolean): void;

  /** Returns ad metadata for a slot. The UI decides how to render. */
  getAd(slot: AdSlot): AdDescriptor;
}

/* ===================================================================== */
/* Default slot heights + labels                                         */
/* ===================================================================== */

const SLOT_HEIGHTS: Record<AdSlot, number> = {
  "home-top": 100,
  "home-mid": 120,
  "papers-list": 110,
  "syllabus-list": 110,
  "notices-list": 110,
  "settings-top": 90,
};

const SLOT_LABELS: Record<AdSlot, string> = {
  "home-top": "Sponsored — Banner Ad",
  "home-mid": "Sponsored — Banner Ad",
  "papers-list": "Sponsored — Banner Ad",
  "syllabus-list": "Sponsored — Banner Ad",
  "notices-list": "Sponsored — Banner Ad",
  "settings-top": "Sponsored — Banner Ad",
};

/* ===================================================================== */
/* 1. BannerAdsProvider — in-house promos (default)                      */
/* ===================================================================== */

class BannerAdsProvider implements AdsProvider {
  readonly name = "banner" as const;
  private enabled = true;

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  getAd(slot: AdSlot): AdDescriptor {
    return {
      slot,
      render: "banner",
      height: SLOT_HEIGHTS[slot],
      label: SLOT_LABELS[slot],
    };
  }
}

/* ===================================================================== */
/* 2. AdSenseAdsProvider — Google AdSense for web                        */
/* ===================================================================== */

/**
 * Renders `<ins class="adsbygoogle">` elements that the AdSense script
 * (loaded lazily by <AdSenseScript />) fills with real ads.
 *
 * Configure via env vars:
 *   NEXT_PUBLIC_ADSENSE_CLIENT_ID = "ca-pub-XXXXXXXXXXXXXXXX"
 *   NEXT_PUBLIC_ADSENSE_SLOTS     = JSON map of AdSlot → AdSense slot ID
 *                                   e.g. {"home-top":"1234567890","papers-list":"0987654321"}
 *   NEXT_PUBLIC_ADSENSE_FORMAT    = "auto" (default) | "horizontal" | "vertical" | "rectangle"
 *   NEXT_PUBLIC_ADSENSE_RESPONSIVE= "true" (default) | "false"
 *
 * Slots not present in the map return render="none" (silently skipped).
 */
class AdSenseAdsProvider implements AdsProvider {
  readonly name = "adsense" as const;
  private enabled = true;
  private adClient: string;
  private slotMap: Partial<Record<AdSlot, string>>;
  private adFormat: "auto" | "horizontal" | "vertical" | "rectangle";
  private fullWidthResponsive: boolean;

  constructor(opts: {
    adClient: string;
    slotMap?: Partial<Record<AdSlot, string>>;
    adFormat?: "auto" | "horizontal" | "vertical" | "rectangle";
    fullWidthResponsive?: boolean;
  }) {
    this.adClient = opts.adClient;
    this.slotMap = opts.slotMap ?? {};
    this.adFormat = opts.adFormat ?? "auto";
    this.fullWidthResponsive = opts.fullWidthResponsive ?? true;
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  getAd(slot: AdSlot): AdDescriptor {
    const adSlot = this.slotMap[slot];
    // If the slot isn't configured in the env map, render nothing — avoids
    // shipping empty <ins> elements that AdSense would log warnings about.
    if (!adSlot) {
      return { slot, render: "none", height: 0, label: "" };
    }
    return {
      slot,
      render: "adsense",
      height: SLOT_HEIGHTS[slot],
      label: "Advertisement",
      adClient: this.adClient,
      adSlot,
      adFormat: this.adFormat,
      fullWidthResponsive: this.fullWidthResponsive,
    };
  }
}

/* ===================================================================== */
/* 3. AdMobAdsProvider — Google AdMob for Capacitor native               */
/* ===================================================================== */

/**
 * Returns descriptors that <BannerAd /> renders as placeholder divs to
 * reserve layout space. The actual native banner is shown by
 * <AdMobInitializer /> via dynamic import of @capacitor-community/admob.
 *
 * On native (Capacitor) builds, the native banner overlays the webview at
 * the configured position (top/bottom). On web, the placeholder div is
 * rendered but no native banner appears — useful for layout testing.
 *
 * Configure via env vars:
 *   NEXT_PUBLIC_ADMOB_APP_ID      = "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
 *   NEXT_PUBLIC_ADMOB_BANNER_ID   = "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
 *                                   (default ad unit for all slots)
 *   NEXT_PUBLIC_ADMOB_SLOTS       = JSON map of AdSlot → ad unit ID (overrides default)
 *   NEXT_PUBLIC_ADMOB_BANNER_SIZE = "SMART_BANNER" (default) | "BANNER" | "LARGE_BANNER" | ...
 *   NEXT_PUBLIC_ADMOB_POSITION    = "TOP_CENTER" (default) | "BOTTOM_CENTER"
 *
 * AdMob native banners are typically a single banner per screen — by default
 * only `home-top` is enabled (others return render="none"). Override via
 * NEXT_PUBLIC_ADMOB_SLOTS to enable more slots.
 */
class AdMobAdsProvider implements AdsProvider {
  readonly name = "admob" as const;
  private enabled = true;
  private defaultAdUnitId: string;
  private slotMap: Partial<Record<AdSlot, string>>;
  private bannerSize: AdMobBannerSize;
  /** Slots that should reserve layout space for the native banner. */
  private activeSlots: Set<AdSlot>;

  constructor(opts: {
    defaultAdUnitId: string;
    slotMap?: Partial<Record<AdSlot, string>>;
    bannerSize?: AdMobBannerSize;
    activeSlots?: AdSlot[];
  }) {
    this.defaultAdUnitId = opts.defaultAdUnitId;
    this.slotMap = opts.slotMap ?? {};
    this.bannerSize = opts.bannerSize ?? "SMART_BANNER";
    // Default: only home-top reserves space. Other slots are no-ops because
    // AdMob native banners are typically a single banner per screen.
    this.activeSlots = new Set(opts.activeSlots ?? ["home-top"]);
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  getAd(slot: AdSlot): AdDescriptor {
    if (!this.activeSlots.has(slot)) {
      return { slot, render: "none", height: 0, label: "" };
    }
    const adUnitId = this.slotMap[slot] ?? this.defaultAdUnitId;
    return {
      slot,
      render: "admob",
      height: SLOT_HEIGHTS[slot],
      label: "Advertisement",
      adUnitId,
      adSize: this.bannerSize,
    };
  }
}

/* ===================================================================== */
/* 4. NoAdsProvider — kill switch                                        */
/* ===================================================================== */

class NoAdsProvider implements AdsProvider {
  readonly name = "none" as const;
  private enabled = false;

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  getAd(slot: AdSlot): AdDescriptor {
    return { slot, render: "none", height: 0, label: "" };
  }
}

/* ===================================================================== */
/* Factory — picks provider based on NEXT_PUBLIC_ADS_PROVIDER            */
/* ===================================================================== */

export type AdsProviderName = "banner" | "adsense" | "admob" | "none";

/**
 * Read NEXT_PUBLIC_* env vars and construct the appropriate provider.
 *
 * Falls back to BannerAdsProvider if the requested provider's required env
 * vars are missing — so a misconfigured deploy never serves broken ads.
 */
export function createAdsProviderFromEnv(): AdsProvider {
  const requested = (process.env.NEXT_PUBLIC_ADS_PROVIDER ?? "banner").toLowerCase() as AdsProviderName;

  if (requested === "adsense") {
    const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
    if (!adClient) {
      console.warn(
        "[ads] NEXT_PUBLIC_ADS_PROVIDER=adsense but NEXT_PUBLIC_ADSENSE_CLIENT_ID is not set. Falling back to banner.",
      );
      return new BannerAdsProvider();
    }
    let slotMap: Partial<Record<AdSlot, string>> = {};
    try {
      slotMap = JSON.parse(process.env.NEXT_PUBLIC_ADSENSE_SLOTS ?? "{}");
    } catch {
      console.warn("[ads] Invalid JSON in NEXT_PUBLIC_ADSENSE_SLOTS. Using empty slot map.");
    }
    return new AdSenseAdsProvider({
      adClient,
      slotMap,
      adFormat: (process.env.NEXT_PUBLIC_ADSENSE_FORMAT as "auto" | "horizontal" | "vertical" | "rectangle") ?? "auto",
      fullWidthResponsive: process.env.NEXT_PUBLIC_ADSENSE_RESPONSIVE !== "false",
    });
  }

  if (requested === "admob") {
    const defaultAdUnitId = process.env.NEXT_PUBLIC_ADMOB_BANNER_ID;
    if (!defaultAdUnitId) {
      console.warn(
        "[ads] NEXT_PUBLIC_ADS_PROVIDER=admob but NEXT_PUBLIC_ADMOB_BANNER_ID is not set. Falling back to banner.",
      );
      return new BannerAdsProvider();
    }
    let slotMap: Partial<Record<AdSlot, string>> = {};
    try {
      slotMap = JSON.parse(process.env.NEXT_PUBLIC_ADMOB_SLOTS ?? "{}");
    } catch {
      console.warn("[ads] Invalid JSON in NEXT_PUBLIC_ADMOB_SLOTS. Using default ad unit for all slots.");
    }
    const bannerSize = (process.env.NEXT_PUBLIC_ADMOB_BANNER_SIZE as AdMobBannerSize) ?? "SMART_BANNER";
    let activeSlots: AdSlot[] = ["home-top"];
    try {
      const raw = process.env.NEXT_PUBLIC_ADMOB_ACTIVE_SLOTS;
      if (raw) activeSlots = JSON.parse(raw) as AdSlot[];
    } catch {
      /* keep default */
    }
    return new AdMobAdsProvider({
      defaultAdUnitId,
      slotMap,
      bannerSize,
      activeSlots,
    });
  }

  if (requested === "none") {
    return new NoAdsProvider();
  }

  // Default
  return new BannerAdsProvider();
}

/* ===================================================================== */
/* Singleton accessor + test override                                    */
/* ===================================================================== */

let _instance: AdsProvider | null = null;

export function getAdsProvider(): AdsProvider {
  if (!_instance) _instance = createAdsProviderFromEnv();
  return _instance;
}

export function __setAdsProvider(p: AdsProvider) {
  _instance = p;
}

/* ===================================================================== */
/* Env-var inspection helpers (used by <AdSenseScript /> + <AdMobInitializer />) */
/* ===================================================================== */

/** Returns true if the active provider is AdSense. */
export function isAdSenseActive(): boolean {
  return getAdsProvider().name === "adsense";
}

/** Returns the configured AdSense client ID (ca-pub-XXXX) or null. */
export function getAdSenseClientId(): string | null {
  return process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? null;
}

/** Returns true if the active provider is AdMob. */
export function isAdMobActive(): boolean {
  return getAdsProvider().name === "admob";
}

/** Returns the configured AdMob app ID (ca-app-pub-XXXX~XXXX) or null. */
export function getAdMobAppId(): string | null {
  return process.env.NEXT_PUBLIC_ADMOB_APP_ID ?? null;
}

/** Returns the configured AdMob banner ad unit ID or null. */
export function getAdMobBannerId(): string | null {
  return process.env.NEXT_PUBLIC_ADMOB_BANNER_ID ?? null;
}

/** Returns the configured AdMob banner position: "TOP_CENTER" | "BOTTOM_CENTER". */
export function getAdMobPosition(): "TOP_CENTER" | "BOTTOM_CENTER" {
  return (process.env.NEXT_PUBLIC_ADMOB_POSITION as "TOP_CENTER" | "BOTTOM_CENTER") ?? "BOTTOM_CENTER";
}

/** Returns the configured AdMob banner size. */
export function getAdMobBannerSize(): AdMobBannerSize {
  return (process.env.NEXT_PUBLIC_ADMOB_BANNER_SIZE as AdMobBannerSize) ?? "SMART_BANNER";
}
