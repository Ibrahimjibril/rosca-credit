"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

const ITEMS = [
  { key: "home", href: "/", icon: "🏠" },
  { key: "groups", href: "/groups", icon: "👥" },
  { key: "wallet", href: "/wallet", icon: "💳" },
  { key: "profile", href: "/profile", icon: "👤" },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-sand/10 bg-indigo-950/95 backdrop-blur px-2 py-2 flex justify-around z-30">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-mono ${
              active ? "text-gold-400" : "text-sand/50"
            }`}
          >
            <span className="text-lg" aria-hidden>{item.icon}</span>
            {t(item.key as any)}
          </Link>
        );
      })}
    </nav>
  );
}
