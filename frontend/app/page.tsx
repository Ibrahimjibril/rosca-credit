"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { GroupCard } from "@/components/GroupCard";
import { useGroupCount } from "@/lib/hooks";

export default function Home() {
  const { data: groupCount, isLoading } = useGroupCount();
  const count = groupCount ? Number(groupCount) : 0;
  const ids = Array.from({ length: count }, (_, i) => count - 1 - i); // newest first

  return (
    <main className="max-w-3xl mx-auto pb-24">
      <Header />

      <section className="px-6 md:px-10 mt-6 mb-10">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-gold-500">
          Ajo / Adashi — on-chain
        </p>
        <h1 className="font-display italic text-4xl md:text-5xl text-sand mt-2 max-w-lg leading-tight">
          Ku tara, ku juya, ku amince.
        </h1>
        <p className="text-sand/60 mt-4 max-w-md">
          Kowane rukuni na Rosca_Credit da'ira ce ta amana: kowa yana bayarwa
          kowane zagaye, kowa yana karɓa lokacinsa ya yi — a bayyane, akan
          Arc Testnet.
        </p>
        <Link
          href="/create"
          className="focus-ring inline-block mt-6 rounded-full bg-gold-500 text-indigo-950 font-medium px-6 py-3 hover:bg-gold-400 transition-colors"
        >
          Ƙirƙiri sabon rukuni
        </Link>
      </section>

      <section className="px-6 md:px-10">
        <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-sand/40 mb-4">
          Dukkan rukunoni
        </h2>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-sand/10 bg-indigo-800/40 p-5 h-32 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && count === 0 && (
          <div className="rounded-xl border border-dashed border-sand/15 p-8 text-center text-sand/50">
            Babu wani rukuni tukuna. Kai za ka fara?
          </div>
        )}

        <div className="space-y-3">
          {ids.map((id) => (
            <GroupCard key={id} groupId={id} />
          ))}
        </div>
      </section>
    </main>
  );
}
