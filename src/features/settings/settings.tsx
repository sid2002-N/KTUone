"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor,
  Heart,
  Info,
  MessageSquare,
  Shield,
  FileText,
  ChevronRight,
  Github,
  Sparkles,
  Languages,
  Vibrate,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { Mascot } from "@/components/brand/mascot";
import { BannerAd } from "@/components/ui-custom/banner-ad";
import { useThemeStore } from "@/store/theme-store";
import { useSupporterStore } from "@/store/supporter-store";
import { useNavStore } from "@/store/nav-store";
import { getAnalyticsProvider } from "@/lib/providers/analytics";
import { getNotificationProvider } from "@/lib/providers/notification";
import { APP_VERSION, UNIVERSITY_NAME, APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Settings() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const resolved = useThemeStore((s) => s.resolved);
  const isSupporter = useSupporterStore((s) => s.isSupporter);
  const setSupportOpen = useNavStore((s) => s.setSupportOpen);
  const prefersReduced = useReducedMotion();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Personalise KTU One, manage your account and find help."
        icon={<SettingsIcon className="size-5" />}
      />

      <div className="space-y-5">
        {/* Supporter status */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isSupporter ? (
            <GlassCard className="p-5">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-gradient-plum flex items-center justify-center">
                  <Sparkles className="size-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">You're a Lifetime Supporter</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ads are removed forever. Thank you 💜
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  Active
                </span>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-5">
              <div className="flex items-center gap-4">
                <Mascot size={56} mood="happy" />
                <div className="flex-1">
                  <p className="font-semibold">Support KTU One</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Remove ads · ₹99 lifetime · support development
                  </p>
                </div>
                <button
                  onClick={() => setSupportOpen(true)}
                  className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition shadow-soft flex items-center gap-1.5"
                >
                  <Heart className="size-3.5" fill="currentColor" />
                  Support
                </button>
              </div>
            </GlassCard>
          )}
        </motion.div>

        {/* Appearance */}
        <SettingsGroup title="Appearance" icon={<Sparkles className="size-4" />}>
          <SettingsRow label="Theme" description="Switch between light, dark, or system.">
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-secondary/60">
              {(["light", "dark", "system"] as const).map((m) => {
                const Icon = m === "light" ? Sun : m === "dark" ? Moon : Monitor;
                const isActive = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      getAnalyticsProvider().track({
                        name: "theme_changed",
                        props: { theme: m },
                      });
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 capitalize transition",
                      isActive
                        ? "bg-background shadow-soft text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {m}
                  </button>
                );
              })}
            </div>
          </SettingsRow>
          <SettingsRow label="Current" description={`Currently rendering as ${resolved}.`}>
            <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
              {resolved === "dark" ? "Dark" : "Light"}
            </span>
          </SettingsRow>
        </SettingsGroup>

        {/* Preferences */}
        <SettingsGroup title="Preferences" icon={<Vibrate className="size-4" />}>
          <SettingsRow label="Language" description="Currently English. Malayalam coming soon.">
            <Languages className="size-4 text-muted-foreground" />
          </SettingsRow>
          <SettingsRow label="Haptics" description="Vibrate on interactions (mobile only).">
            <ToggleSwitch defaultChecked />
          </SettingsRow>
          <SettingsRow label="Reduced motion" description="Respect system reduced-motion.">
            <ToggleSwitch defaultChecked />
          </SettingsRow>
        </SettingsGroup>

        {/* About */}
        <SettingsGroup title="About" icon={<Info className="size-4" />}>
          <SettingsRow label="App version" description={`KTU One v${APP_VERSION}`}>
            <span className="text-xs text-muted-foreground">{APP_VERSION}</span>
          </SettingsRow>
          <SettingsRow label="University" description={UNIVERSITY_NAME}>
            <span className="text-xs text-muted-foreground">KTU</span>
          </SettingsRow>
          <button
            onClick={() =>
              getNotificationProvider().show({
                kind: "info",
                title: "KTU One",
                message: "An independent project. Not affiliated with KTU.",
              })
            }
            className="w-full"
          >
            <SettingsRow label="Disclaimer" description="KTU One is an independent student companion." chevron />
          </button>
        </SettingsGroup>

        {/* Help & feedback */}
        <SettingsGroup title="Help & feedback" icon={<MessageSquare className="size-4" />}>
          <button
            onClick={() =>
              getNotificationProvider().show({
                kind: "info",
                title: "Feedback form",
                message: "Coming soon — for now, ping us at hello@ktuone.in",
              })
            }
            className="w-full"
          >
            <SettingsRow label="Send feedback" description="Suggest features or report issues." chevron />
          </button>
          <button className="w-full">
            <SettingsRow label="Rate KTU One" description="Help others discover the app." chevron />
          </button>
          <button className="w-full">
            <SettingsRow label="Share with friends" description="Spread the word." chevron />
          </button>
        </SettingsGroup>

        {/* Legal */}
        <SettingsGroup title="Legal" icon={<Shield className="size-4" />}>
          <button className="w-full">
            <SettingsRow label="Privacy policy" description="How we handle your data." chevron icon={<FileText className="size-4" />} />
          </button>
          <button className="w-full">
            <SettingsRow label="Terms of service" description="The rules of using KTU One." chevron icon={<FileText className="size-4" />} />
          </button>
          <a
            href="#"
            className="w-full"
            onClick={(e) => e.preventDefault()}
          >
            <SettingsRow label="Open source" description="Built with open-source tools." chevron icon={<Github className="size-4" />} />
          </a>
        </SettingsGroup>

        {!isSupporter && (
          <BannerAd slot="settings-top" />
        )}

        {/* Footer */}
        <div className="text-center py-6">
          <Mascot size={64} mood="happy" className="mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">
            {APP_NAME} · Made with 💜 for KTU students
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingsGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <GlassCard className="p-2">
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          {title}
        </h3>
      </div>
      <div className="divide-y divide-border/40">{children}</div>
    </GlassCard>
  );
}

function SettingsRow({
  label,
  description,
  children,
  chevron,
  icon,
}: {
  label: string;
  description?: string;
  children?: React.ReactNode;
  chevron?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-3 hover:bg-secondary/40 transition rounded-xl">
      <div className="flex items-start gap-3 min-w-0">
        {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {children}
        {chevron && <ChevronRight className="size-4 text-muted-foreground" />}
      </div>
    </div>
  );
}

function ToggleSwitch({ defaultChecked }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked ?? false);
  return (
    <button
      onClick={() => setOn(!on)}
      className={cn(
        "w-11 h-6 rounded-full transition relative",
        on ? "bg-primary" : "bg-secondary",
      )}
      role="switch"
      aria-checked={on}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-white shadow-soft transition-all",
          on ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}
