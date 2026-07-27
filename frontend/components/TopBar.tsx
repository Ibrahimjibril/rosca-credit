"use client";

import { LogoLockup } from "@/components/Logo";
import { ConnectWallet } from "@/components/ConnectWallet";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function TopBar() {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5 md:px-8 md:py-3 border-b border-sand/10 overflow-x-hidden">
      <div className="md:hidden min-w-0 shrink">
        <LogoLockup />
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2 min-w-0 shrink">
        <LanguageSwitcher />
        <ConnectWallet />
      </div>
    </div>
  );
}
