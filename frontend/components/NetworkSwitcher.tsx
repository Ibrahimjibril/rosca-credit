"use client";

import { useState } from "react";
import { useNetwork } from "@/contexts/NetworkContext";

export function NetworkSwitcher() {
  const { network, setNetwork } = useNetwork();
  const [confirming, setConfirming] = useState(false);
  const isMainnet = network === "mainnet";

  function handleToggle() {
    if (network === "testnet") {
      setConfirming(true);
    } else {
      setNetwork("testnet");
    }
  }

  function confirmMainnet() {
    setNetwork("mainnet");
    setConfirming(false);
  }

  return (
    <div
      className={`rounded-xl border-2 p-3 transition-colors ${
        isMainnet
          ? "border-gold-600/60 bg-gold-500/20"
          : "border-orange-500/60 bg-orange-500/15"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isMainnet ? "bg-gold-600" : "bg-orange-500 animate-pulse"
            }`}
          />
          <span className={`text-xs font-mono font-bold truncate ${isMainnet ? "text-gold-600" : "text-orange-600"}`}>
            {isMainnet ? "Arc Mainnet" : "Arc Testnet"}
          </span>
        </div>
        <button
          onClick={handleToggle}
          className={`focus-ring shrink-0 rounded-full px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wide transition-colors ${
            isMainnet
              ? "bg-gold-500 text-indigo-950 hover:bg-gold-400"
              : "bg-orange-500 text-indigo-950 hover:bg-orange-400"
          }`}
        >
          Switch
        </button>
      </div>
      {!isMainnet && (
        <div className="text-[10px] text-orange-600/90 mt-1 font-mono font-medium">Using test funds — not real money</div>
      )}

      {confirming && (
        <div className="mt-2 rounded-md border border-gold-500/30 bg-gold-500/10 p-2">
          <p className="text-[11px] text-sand/80 leading-relaxed">
            Switching to Mainnet uses real USDC. Continue?
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={confirmMainnet}
              className="focus-ring flex-1 rounded-full bg-gold-500 text-indigo-950 text-[11px] font-medium py-1.5"
            >
              Yes, use Mainnet
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="focus-ring flex-1 rounded-full border border-sand/15 text-sand/60 text-[11px] py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
