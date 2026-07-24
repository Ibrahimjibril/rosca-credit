"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-5 md:px-10 md:py-8">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="font-display italic text-2xl text-sand">Rosca</span>
        <span className="font-mono text-xs tracking-[0.15em] text-gold-500 uppercase">_Credit</span>
      </Link>
      <ConnectButton showBalance={false} />
    </header>
  );
}
