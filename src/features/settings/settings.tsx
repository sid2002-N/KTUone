"use client";

import { useState, useEffect } from "react";
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
  LogOut,
} from "lucide-react";
import { EmptyState } from "@/components/ui-custom/empty-state";
import { BannerAd } from "@/components/ui-custom/banner-ad";
import { useThemeStore } from "@/store/theme-store";
import { useSupporterStore } from "@/store/supporter-store";
import { useAuthStore } from "@/store/auth-store";
import { useNavStore } from "@/store/nav-store";
import { getAnalyticsProvider } from "@/lib/providers/analytics";
import { getNotificationProvider } from "@/lib/providers/notification";
import { getStudentService } from "@/lib/providers/student";
import { APP_VERSION, UNIVERSITY_NAME, APP_NAME } from "@/lib/constants";
import { hapticSync } from "@/lib/utils/haptics";
import { cn } from "@/lib/utils";

export function Settings() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const resolved = useThemeStore((s) => s.resolved);
  const isSupporter = useSupporterStore((s) => s.isSupporter);
  const setSupportOpen = useNavStore((s) => s.setSupportOpen);
  const profile = useAuthStore((s) => s.profile);
  const clearAuth = useAuthStore((s) => s.clear);
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  const handleLogout = async () => {
    hapticSync("medium");
    await getStudentService().logout();
    clearAuth();
    getNotificationProvider().show({
      kind: "info",
      title: "Signed out",
      message: "You can sign back in anytime.",
    });
  };

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div>
        <div className="section-eyebrow">Account</div>
        <h1 className="section-title text-[28px] md:text-[32px] mt-2">Settings</h1>
      </div>

      {/* ===== PROFILE CARD ===== */}
      {profile ? (
        <motion.div
          initial={mounted && !prefersReduced ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="card p-5 flex items-center gap-4">
            <div className="size-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-serif text-xl font-semibold">
              {profile.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold">{profile.name}</p>
              <p className="text-[12px] font-mono text-muted-foreground mt-0.5">
                {profile.registerNumber}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {profile.branchName} · S{profile.semester}
              </p>
            </div>
            {isSupporter && (
              <span className="tag tag-amber flex items-center gap-1">
                <Sparkles className="size-3" /> Supporter
              </span>
            )}
          </div>
        </motion.div>
      ) : null}

      {/* ===== APPEARANCE ===== */}
      <SettingsSection title="Appearance">
        <SettingsRow
          icon={<Sun className="size-4" />}
          label="Theme"
          description="Switch between light, dark, or system."
        >
          <div className="flex items-center gap-0.5 p-1 rounded-lg bg-secondary">
            {(["light", "dark", "system"] as const).map((m) => {
              const Icon = m === "light" ? Sun : m === "dark" ? Moon : Monitor;
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => {
                    hapticSync("light");
                    setMode(m);
                    getAnalyticsProvider().track({
                      name: "theme_changed",
                      props: { theme: m },
                    });
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 capitalize transition",
                    isActive
                      ? "bg-card text-foreground shadow-sm"
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
      </SettingsSection>

      {/* ===== PREFERENCES ===== */}
      <SettingsSection title="Preferences">
        <SettingsRow
          icon={<Languages className="size-4" />}
          label="Language"
          description="English"
        >
          <ChevronRight className="size-4 text-muted-foreground" />
        </SettingsRow>
        <SettingsRow
          icon={<Vibrate className="size-4" />}
          label="Haptics"
          description="Vibration feedback on interactions."
        >
          <ToggleSwitch
            defaultChecked
            onChange={() => hapticSync("light")}
          />
        </SettingsRow>
      </SettingsSection>

      {/* ===== SUPPORT ===== */}
      {!isSupporter && (
        <SettingsSection title="Support KTU One">
          <button
            onClick={() => {
              hapticSync("light");
              setSupportOpen(true);
            }}
            className="w-full text-left"
          >
            <SettingsRow
              icon={<Heart className="size-4" />}
              label="Become a Supporter"
              description="Remove ads · ₹99 lifetime"
              chevron
            />
          </button>
        </SettingsSection>
      )}

      {/* ===== ABOUT ===== */}
      <SettingsSection title="About">
        <SettingsRow
          icon={<Info className="size-4" />}
          label="App version"
          description={`KTU One v${APP_VERSION}`}
        >
          <span className="text-[12px] font-mono text-muted-foreground">{APP_VERSION}</span>
        </SettingsRow>
        <SettingsRow
          icon={<SettingsIcon className="size-4" />}
          label="University"
          description={UNIVERSITY_NAME}
        >
          <span className="text-[12px] font-mono text-muted-foreground">KTU</span>
        </SettingsRow>
        <button
          onClick={() =>
            getNotificationProvider().show({
              kind: "info",
              title: "KTU One",
              message: "An independent project. Not affiliated with KTU.",
            })
          }
          className="w-full text-left"
        >
          <SettingsRow
            icon={<Shield className="size-4" />}
            label="Disclaimer"
            description="Independent student companion."
            chevron
          />
        </button>
      </SettingsSection>

      {/* ===== HELP & FEEDBACK ===== */}
      <SettingsSection title="Help & feedback">
        <button
          onClick={() =>
            getNotificationProvider().show({
              kind: "info",
              title: "Feedback",
              message: "hello@ktuone.in",
            })
          }
          className="w-full text-left"
        >
          <SettingsRow
            icon={<MessageSquare className="size-4" />}
            label="Send feedback"
            description="Suggest features or report issues."
            chevron
          />
        </button>
        <button className="w-full text-left">
          <SettingsRow
            icon={<Heart className="size-4" />}
            label="Rate KTU One"
            description="Help others discover the app."
            chevron
          />
        </button>
      </SettingsSection>

      {/* ===== LEGAL ===== */}
      <SettingsSection title="Legal">
        <button className="w-full text-left">
          <SettingsRow
            icon={<FileText className="size-4" />}
            label="Privacy policy"
            description="How we handle your data."
            chevron
          />
        </button>
        <button className="w-full text-left">
          <SettingsRow
            icon={<FileText className="size-4" />}
            label="Terms of service"
            description="The rules of using KTU One."
            chevron
          />
        </button>
        <a href="#" className="w-full text-left" onClick={(e) => e.preventDefault()}>
          <SettingsRow
            icon={<Github className="size-4" />}
            label="Open source"
            description="Built with open-source tools."
            chevron
          />
        </a>
      </SettingsSection>

      {/* ===== SIGN OUT ===== */}
      {profile && (
        <SettingsSection title="Account">
          <button
            onClick={handleLogout}
            className="w-full text-left"
          >
            <SettingsRow
              icon={<LogOut className="size-4" />}
              label="Sign out"
              description="Sign out of your KTU account."
            >
              <ChevronRight className="size-4 text-muted-foreground" />
            </SettingsRow>
          </button>
        </SettingsSection>
      )}

      {/* ===== AD ===== */}
      {!isSupporter && <BannerAd slot="settings-top" />}

      {/* ===== FOOTER ===== */}
      <div className="text-center py-6">
        <p className="text-[11px] font-mono text-[color:var(--text-faint)]">
          {APP_NAME} · v{APP_VERSION} · {UNIVERSITY_NAME}
        </p>
        <p className="text-[11px] text-[color:var(--text-faint)] mt-1">
          Built for KTU students · not affiliated with the university
        </p>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* SETTINGS COMPONENTS — Apple Settings style                                */
/* ========================================================================== */

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="section-eyebrow mb-2 px-1">{title}</h2>
      <div className="card overflow-hidden">
        <div className="divide-y divide-[var(--hairline-soft)]">{children}</div>
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  description,
  children,
  chevron,
}: {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  children?: React.ReactNode;
  chevron?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-secondary/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <div className="min-w-0">
          <p className="text-[14px] font-medium">{label}</p>
          {description && (
            <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>
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

function ToggleSwitch({
  defaultChecked,
  onChange,
}: {
  defaultChecked?: boolean;
  onChange?: () => void;
}) {
  const [on, setOn] = useState(defaultChecked ?? false);
  return (
    <button
      onClick={() => {
        setOn(!on);
        onChange?.();
      }}
      className={cn(
        "w-11 h-6 rounded-full transition-colors relative",
        on ? "bg-primary" : "bg-secondary border border-border",
      )}
      role="switch"
      aria-checked={on}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all",
          on ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}
