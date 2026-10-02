"use client";

import { useState } from "react";
import { useNetwork } from "@/contexts/NetworkContext";

export function NetworkSwitcher() {
  const { network, setNetwork } = useNetwork();
  const [confirming, setConfirming] = useState(false);

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
    <div className="rounded-lg border border-sand/10 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${network === "mainnet" ? "bg-gold-500" : "bg-orange-400"}`} />
          <span className="text-[11px] font-mono text-sand/60 truncate">
            {network === "mainnet" ? "Arc Mainnet" : "Arc Testnet (test funds)"}
          </span>
        </div>
        <button
          onClick={handleToggle}
          className="focus-ring shrink-0 text-[10px] font-mono uppercase tracking-wide text-gold-500 hover:text-gold-400"
        >
          Switch
        </button>
      </div>

      {confirming && (
        <div className="mt-2 rounded-md border border-gold-500/30 bg-gold-500/5 p-2">
          <p className="text-[11px] text-sand/70 leading-relaxed">
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
