"use client";

import { useActiveAccount } from "thirdweb/react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function InvitePage() {
  const account = useActiveAccount();
  const { t } = useLanguage();
  const link = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <main className="max-w-lg mx-auto px-5 md:px-8 py-6">
      <h1 className="font-display italic text-2xl text-sand mb-6">{t("inviteFriends")}</h1>
      <p className="text-sand/60 text-sm mb-6">
        Share Rosca_Credit with friends and family — the more trusted members in a group,
        the smoother the rotation.
      </p>
      <div className="rounded-xl border border-sand/10 bg-indigo-800/40 p-4 flex items-center justify-between gap-3">
        <span className="font-mono text-sm text-sand/70 truncate">{link || "rosca-credit.vercel.app"}</span>
        <button
          onClick={() => account && navigator.clipboard?.writeText(link)}
          className="focus-ring rounded-full bg-gold-500 text-indigo-950 text-xs font-medium px-4 py-2 shrink-0"
        >
          Copy
        </button>
      </div>
    </main>
  );
}
