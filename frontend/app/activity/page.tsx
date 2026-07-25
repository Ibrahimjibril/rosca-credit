"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export default function ActivityPage() {
  const { t } = useLanguage();
  return (
    <main className="max-w-lg mx-auto px-5 md:px-8 py-6">
      <h1 className="font-display italic text-2xl text-sand mb-6">{t("activity")}</h1>
      <div className="rounded-xl border border-dashed border-sand/15 p-10 text-center text-sand/50 text-sm">
        This will list contributions, settlements, and stake claims across all your groups,
        read live from on-chain events (Contributed, RoundSettled, StakeClaimed). Open a specific
        group page for its live status in the meantime.
      </div>
    </main>
  );
}
