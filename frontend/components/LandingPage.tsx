"use client";

import { ConnectWallet } from "@/components/ConnectWallet";
import { LogoMark } from "@/components/Logo";

const FEATURES = [
  {
    icon: "🛡️",
    title: "Trustless",
    desc: "Smart contracts secure everyone's contributions — no admin can run off with the pot.",
  },
  {
    icon: "⚡",
    title: "Fast & Cheap",
    desc: "Built on Arc for lightning speed and near-zero fees.",
  },
  {
    icon: "🤝",
    title: "Together",
    desc: "Community first. Everyone's stake keeps the group moving, even if someone misses a round.",
  },
];

const PANEL_POINTS = [
  { icon: "🔒", title: "Secure & Non-Custodial", desc: "Your funds are locked in smart contracts, not held by us." },
  { icon: "💳", title: "Automatic Wallet", desc: "A wallet is created for you on Arc Testnet — no setup needed." },
  { icon: "🔑", title: "No Private Keys", desc: "We abstract the complexity away. You just sign in and go." },
];

export function LandingPage() {
  return (
    <main className="max-w-6xl mx-auto px-5 md:px-10 py-10 md:py-16">
      <div className="grid lg:grid-cols-2 gap-10 items-start">
        {/* Left: hero */}
        <div>
          <div className="flex items-center gap-3">
            <LogoMark size={44} />
            <div>
              <div className="font-display italic text-2xl text-sand leading-none">Rosca-Credit</div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-gold-500 uppercase mt-1">
                On-chain rotating savings
              </div>
            </div>
          </div>

          <h1 className="font-display italic text-4xl md:text-5xl text-sand mt-8 leading-tight">
            Collect. Save. Grow. <span className="text-gold-500">Together.</span>
          </h1>

          <p className="text-sand/60 mt-5 max-w-md leading-relaxed">
            Rosca-Credit brings traditional savings groups (ROSCA / Adashi / Ajo) onto the
            blockchain. Transparent. Secure. Decentralized. Built on the Arc Network, with a
            built-in staking safety net that keeps every group on track.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mt-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-sand/10 bg-indigo-800/40 p-4">
                <div className="text-xl">{f.icon}</div>
                <div className="text-sand font-medium text-sm mt-2">{f.title}</div>
                <div className="text-sand/50 text-xs mt-1 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: sign-in panel */}
        <div className="rounded-2xl border border-sand/10 bg-indigo-800/40 p-6 md:p-8 lg:sticky lg:top-10">
          <div className="text-center">
            <LogoMark size={48} />
            <h2 className="font-display text-xl text-sand mt-4">Welcome to Rosca-Credit</h2>
            <p className="text-sand/50 text-sm mt-2">
              Join thousands building trust and wealth together.
            </p>
          </div>

          <div className="mt-6 flex justify-center [&>div]:w-full [&_button]:w-full">
            <ConnectWallet />
          </div>

          <div className="mt-8 space-y-4">
            {PANEL_POINTS.map((p) => (
              <div key={p.title} className="flex items-start gap-3">
                <span className="text-lg shrink-0" aria-hidden>{p.icon}</span>
                <div>
                  <div className="text-sand text-sm font-medium">{p.title}</div>
                  <div className="text-sand/50 text-xs mt-0.5">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] text-sand/30 mt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </main>
  );
}
