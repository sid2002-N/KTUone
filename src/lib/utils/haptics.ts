/**
 * Unified haptic feedback — works on iOS (Capacitor), Android (Capacitor +
 * navigator.vibrate), and web (navigator.vibrate where supported).
 *
 * On iOS Safari/WebView, the `navigator.vibrate()` API is NOT supported.
 * The Capacitor Haptics plugin bridges this gap by using the native iOS
 * Taptic Engine via `UIImpactFeedbackGenerator`.
 *
 * Usage:
 *   import { haptic } from "@/lib/utils/haptics";
 *   haptic("light");    // subtle tap
 *   haptic("medium");   // noticeable tap
 *   haptic("heavy");    // strong thump
 *   haptic("success");  // success pattern
 *   haptic("error");    // error pattern
 *
 * Activation checklist (for the Capacitor build):
 *   1. npm install @capacitor/haptics
 *   2. npx cap sync
 *   3. The dynamic import below resolves at runtime on native.
 *   4. On web (no Capacitor), falls back to navigator.vibrate (Android only).
 *   5. On iOS web without Capacitor: silently no-ops (Apple doesn't allow
 *      programmatic vibration in Safari).
 */

type HapticKind = "light" | "medium" | "heavy" | "success" | "error";

let _hapticsPlugin: { impact: (o: { style: string }) => Promise<void>; notification: (o: { type: string }) => Promise<void> } | null | undefined;

/**
 * Dynamically load the Capacitor Haptics plugin. Resolves to null if the
 * package isn't installed or if we're on web. Cached so we only attempt
 * the import once per session.
 *
 * Uses a runtime-built specifier (`"@capacitor" + "/haptics"`) so bundlers
 * can't statically resolve it at build time (prevents "Module not found"
 * warnings when the package isn't installed in the web-only build).
 */
async function loadHapticsPlugin(): Promise<typeof _hapticsPlugin> {
  if (_hapticsPlugin !== undefined) return _hapticsPlugin;

  // Check if we're in a Capacitor native shell
  const cap = typeof window !== "undefined" ? (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor : undefined;
  if (!cap?.isNativePlatform?.()) {
    _hapticsPlugin = null;
    return null;
  }

  try {
    const specifier = "@capacitor" + "/haptics";
    const mod = await import(/* webpackIgnore: true */ specifier);
    _hapticsPlugin = mod.Haptics;
    return _hapticsPlugin;
  } catch {
    _hapticsPlugin = null;
    return null;
  }
}

/**
 * Fire haptic feedback. Safe to call on any platform — silently no-ops if
 * the platform doesn't support it.
 *
 * @param kind  "light" | "medium" | "heavy" | "success" | "error"
 */
export async function haptic(kind: HapticKind): Promise<void> {
  // Try Capacitor Haptics first (works on iOS + Android native)
  const plugin = await loadHapticsPlugin();
  if (plugin) {
    try {
      if (kind === "light" || kind === "medium" || kind === "heavy") {
        await plugin.impact({ style: kind });
      } else {
        await plugin.notification({ type: kind });
      }
      return;
    } catch {
      // Fall through to navigator.vibrate
    }
  }

  // Fallback: navigator.vibrate (Android Chrome only — iOS Safari doesn't support it)
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const patterns: Record<HapticKind, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 40,
      success: [10, 30, 10],
      error: [40, 30, 40],
    };
    navigator.vibrate(patterns[kind]);
  }
}

/**
 * Synchronous haptic — fires immediately without awaiting the plugin load.
 * Uses navigator.vibrate if available (Android), otherwise tries to load
 * the Capacitor plugin in the background. Best for quick UI taps where you
 * don't want to await.
 *
 * @param kind  "light" | "medium" | "heavy" | "success" | "error"
 */
export function hapticSync(kind: HapticKind): void {
  // On Android web, navigator.vibrate works synchronously
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const patterns: Record<HapticKind, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 40,
      success: [10, 30, 10],
      error: [40, 30, 40],
    };
    navigator.vibrate(patterns[kind]);
    return;
  }

  // On native (iOS/Android Capacitor), fire the async version in the background
  void haptic(kind);
}
