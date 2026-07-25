"use client";

import { useActiveAccount } from "thirdweb/react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ProfilePage() {
  const account = useActiveAccount();
  const { t } = useLanguage();

  return (
    <main className="max-w-lg mx-auto px-5 md:px-8 py-6">
      <h1 className="font-display italic text-2xl text-sand mb-6">{t("profile")}</h1>

      {!account ? (
        <div className="rounded-xl border border-dashed border-sand/15 p-10 text-center text-sand/50">
          Sign in with Google to view your profile.
        </div>
      ) : (
        <div className="rounded-xl border border-sand/10 bg-indigo-800/40 p-6">
          <div className="w-16 h-16 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-2xl mb-4">
            👤
          </div>
          <div className="font-mono text-xs text-sand/50 uppercase">Wallet address</div>
          <div className="font-mono text-sand mt-1 break-all">{account.address}</div>
          <div className="font-mono text-xs text-sand/50 uppercase mt-4">Network</div>
          <div className="text-sand mt-1">Arc Testnet</div>
        </div>
      )}
    </main>
  );
}
