/**
 * Ambient type declaration for the optional `@capacitor/haptics` plugin.
 *
 * This file lets TypeScript compile cleanly whether or not the package is
 * installed. When the Capacitor build is set up and the package is added
 * (`npm install @capacitor/haptics`), the real types from the package take
 * precedence over this ambient declaration.
 */

declare module "@capacitor/haptics" {
  export type HapticsImpactStyle = "light" | "medium" | "heavy";
  export type HapticsNotificationType = "success" | "warning" | "error";

  export interface ImpactOptions {
    style: HapticsImpactStyle;
  }

  export interface NotificationOptions {
    type: HapticsNotificationType;
  }

  export interface HapticsPlugin {
    impact(opts: ImpactOptions): Promise<void>;
    notification(opts: NotificationOptions): Promise<void>;
    vibrate(opts: { duration: number }): Promise<void>;
    selectionStart(): Promise<void>;
    selectionChanged(): Promise<void>;
    selectionEnd(): Promise<void>;
  }

  export const Haptics: HapticsPlugin;
  export const ImpactStyle: {
    Light: HapticsImpactStyle;
    Medium: HapticsImpactStyle;
    Heavy: HapticsImpactStyle;
  };
  export const NotificationType: {
    Success: HapticsNotificationType;
    Warning: HapticsNotificationType;
    Error: HapticsNotificationType;
  };
}
