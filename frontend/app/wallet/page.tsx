"use client";

import { useActiveAccount } from "thirdweb/react";
import { formatUnits } from "@/lib/units";
import { useTokenBalance, useTokenSymbol } from "@/lib/hooks";
import { DEFAULT_TOKEN_ADDRESS } from "@/lib/contract";
import { useLanguage } from "@/contexts/LanguageContext";

export default function WalletPage() {
  const account = useActiveAccount();
  const { t } = useLanguage();
  const { data: balance } = useTokenBalance(DEFAULT_TOKEN_ADDRESS, account?.address);
  const { data: symbol } = useTokenSymbol(DEFAULT_TOKEN_ADDRESS);

  return (
    <main className="max-w-lg mx-auto px-5 md:px-8 py-6">
      <h1 className="font-display italic text-2xl text-sand mb-6">{t("wallet")}</h1>

      {!account ? (
        <div className="rounded-xl border border-dashed border-sand/15 p-10 text-center text-sand/50">
          Sign in with Google to view your wallet.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-sand/10 bg-indigo-800/40 p-6 text-center">
            <div className="font-mono text-xs uppercase tracking-wide text-sand/50">{t("totalSavings") === t("totalSavings") ? "Total Balance" : ""}</div>
            <div className="font-display text-3xl text-sand mt-2">
              {balance !== undefined ? formatUnits(balance, 6) : "—"} {symbol ?? "USDC"}
            </div>
            <div className="font-mono text-[11px] text-sand/40 mt-1">
              {account.address.slice(0, 8)}…{account.address.slice(-6)}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button className="focus-ring rounded-full bg-teal-800 text-sand font-medium py-3 hover:bg-teal-700 transition-colors">
                Deposit
              </button>
              <button className="focus-ring rounded-full border border-sand/20 text-sand font-medium py-3 hover:border-gold-500/40 transition-colors">
                Withdraw
              </button>
            </div>
          </div>

          <div className="mt-8">
            <div className="font-mono text-xs uppercase tracking-wide text-sand/40 mb-3">{t("transactionHistory")}</div>
            <div className="rounded-xl border border-dashed border-sand/15 p-6 text-center text-sand/40 text-sm">
              On-chain transaction history for your groups appears in each group's page for now —
              a unified activity feed is coming soon.
            </div>
          </div>
        </>
      )}
    </main>
  );
}
