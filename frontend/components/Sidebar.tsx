"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoLockup } from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActiveAccount, useDisconnect, useActiveWallet } from "thirdweb/react";

const NAV_ITEMS = [
  { key: "home", href: "/", icon: "🏠" },
  { key: "groups", href: "/groups", icon: "👥" },
  { key: "createGroup", href: "/create", icon: "➕" },
  { key: "wallet", href: "/wallet", icon: "💳" },
  { key: "activity", href: "/activity", icon: "📊" },
  { key: "inviteFriends", href: "/invite", icon: "🎁" },
  { key: "notifications", href: "/notifications", icon: "🔔" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-sand/10 min-h-screen px-4 py-6">
      <div className="px-2 mb-8">
        <LogoLockup />
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-gold-500/10 text-gold-400 border border-gold-500/30"
                  : "text-sand/70 hover:bg-indigo-800/50 border border-transparent"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              <span>{t(item.key as any)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 pt-4 border-t border-sand/10">
        <Link
          href="/settings"
          className={`focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
            pathname === "/settings" ? "bg-gold-500/10 text-gold-400 border border-gold-500/30" : "text-sand/70 hover:bg-indigo-800/50 border border-transparent"
          }`}
        >
          <span aria-hidden>⚙️</span>
          <span>{t("settings")}</span>
        </Link>

        {account && (
          <button
            onClick={() => wallet && disconnect(wallet)}
            className="focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sand/50 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <span aria-hidden>↩︎</span>
            <span>{t("logout")}</span>
          </button>
        )}

        <div className="mt-3 rounded-lg border border-sand/10 px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gold-500" />
          <div className="text-[11px] font-mono">
            <div className="text-sand/60">Arc Testnet</div>
            <div className="text-sand/40">
              {account ? `${account.address.slice(0, 6)}…${account.address.slice(-4)}` : "Not connected"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
