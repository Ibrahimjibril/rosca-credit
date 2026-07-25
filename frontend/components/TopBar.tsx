"use client";

import { LogoLockup } from "@/components/Logo";
import { ConnectWallet } from "@/components/ConnectWallet";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function TopBar() {
  return (
    <div className="flex items-center justify-between px-5 py-4 md:px-8 md:py-6 border-b border-sand/10">
      <div className="md:hidden">
        <LogoLockup />
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <ConnectWallet />
      </div>
    </div>
  );
}
