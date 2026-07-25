"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export default function NotificationsPage() {
  const { t } = useLanguage();
  return (
    <main className="max-w-lg mx-auto px-5 md:px-8 py-6">
      <h1 className="font-display italic text-2xl text-sand mb-6">{t("notifications")}</h1>
      <div className="rounded-xl border border-dashed border-sand/15 p-10 text-center text-sand/50 text-sm">
        You're all caught up — no notifications yet. You'll see alerts here for upcoming
        contributions, payouts heading your way, and rounds that need settling.
      </div>
    </main>
  );
}
