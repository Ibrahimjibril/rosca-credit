"use client";

import Link from "next/link";
import { GroupCard } from "@/components/GroupCard";
import { useGroupCount } from "@/lib/hooks";
import { useLanguage } from "@/contexts/LanguageContext";

export default function GroupsPage() {
  const { data: groupCount, isLoading } = useGroupCount();
  const { t } = useLanguage();
  const count = groupCount ? Number(groupCount) : 0;
  const ids = Array.from({ length: count }, (_, i) => count - 1 - i);

  return (
    <main className="max-w-3xl mx-auto px-5 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display italic text-2xl text-sand">{t("groups")}</h1>
        <Link
          href="/create"
          className="focus-ring rounded-full bg-gold-500 text-indigo-950 font-medium px-4 py-2 text-sm hover:bg-gold-400"
        >
          + {t("createGroup")}
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-sand/10 bg-indigo-800/40 p-5 h-32 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && count === 0 && (
        <div className="rounded-xl border border-dashed border-sand/15 p-8 text-center text-sand/50">
          No groups yet. Want to start the first one?
        </div>
      )}

      <div className="space-y-3">
        {ids.map((id) => (
          <GroupCard key={id} groupId={id} />
        ))}
      </div>
    </main>
  );
}
