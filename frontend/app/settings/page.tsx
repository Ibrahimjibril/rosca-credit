"use client";

import { useActiveAccount, useActiveWallet, useDisconnect } from "thirdweb/react";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SettingsPage() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const { lang, setLang, t } = useLanguage();

  return (
    <main className="max-w-lg mx-auto px-5 md:px-8 py-6">
      <h1 className="font-display italic text-2xl text-sand mb-6">{t("settings")}</h1>

      <div className="rounded-xl border border-sand/10 bg-indigo-800/40 p-5 mb-4">
        <div className="font-mono text-xs uppercase tracking-wide text-sand/50 mb-3">Language</div>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`focus-ring rounded-lg px-3 py-2 text-sm border ${
                lang === l.code ? "bg-gold-500 text-indigo-950 border-gold-400 font-medium" : "border-sand/15 text-sand/70"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {account && (
        <button
          onClick={() => wallet && disconnect(wallet)}
          className="focus-ring w-full rounded-full border border-red-400/30 text-red-300 font-medium py-3 hover:bg-red-500/10 transition-colors"
        >
          {t("logout")}
        </button>
      )}
    </main>
  );
}
