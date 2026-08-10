"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function GroupsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" />
      <circle cx="17" cy="8.5" r="2.3" />
      <path d="M15.5 14.2c2.9.5 5 2.7 5 5.8" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="19" height="13" rx="2.2" />
      <path d="M2.5 10h19" />
      <circle cx="17" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

const ITEMS = [
  { key: "home", href: "/", Icon: HomeIcon },
  { key: "groups", href: "/groups", Icon: GroupsIcon },
  { key: "wallet", href: "/wallet", Icon: WalletIcon },
  { key: "menu", href: "/settings", Icon: MenuIcon },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-sand/10 bg-indigo-950/95 backdrop-blur px-2 py-2 flex justify-around z-30">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.Icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-mono ${
              active ? "text-gold-400" : "text-sand/50"
            }`}
          >
            <Icon />
            {t(item.key as any)}
          </Link>
        );
      })}
    </nav>
  );
}
