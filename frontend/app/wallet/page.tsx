"use client";

import { useState } from "react";
import Link from "next/link";
import { prepareTransaction } from "thirdweb";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { formatUnits, toUnits } from "@/lib/units";
import { useTokenBalance, useTokenSymbol } from "@/lib/hooks";
import { DEFAULT_TOKEN_ADDRESS } from "@/lib/contract";
import { useLanguage } from "@/contexts/LanguageContext";
import { client } from "@/lib/thirdwebClient";
import { arcTestnet } from "@/lib/chain";

type Panel = "none" | "deposit" | "withdraw";

export default function WalletPage() {
  const account = useActiveAccount();
  const { t } = useLanguage();
  const { data: balance, refetch: refetchBalance } = useTokenBalance(DEFAULT_TOKEN_ADDRESS, account?.address);
  const { data: symbol } = useTokenSymbol(DEFAULT_TOKEN_ADDRESS);

  const [panel, setPanel] = useState<Panel>("none");
  const [copied, setCopied] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const { mutate: sendTx, isPending, isSuccess, error } = useSendTransaction();

  function handleCopy() {
    if (!account) return;
    navigator.clipboard?.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !recipient || !amount) return;

    const tx = prepareTransaction({
      to: recipient as `0x${string}`,
      chain: arcTestnet,
      client,
      value: toUnits(amount, 18), // native USDC uses 18 decimals on Arc
    });

    sendTx(tx, {
      onSuccess: () => {
        setRecipient("");
        setAmount("");
        refetchBalance();
        setTimeout(() => setPanel("none"), 1500);
      },
    });
  }

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
            <div className="font-mono text-xs uppercase tracking-wide text-sand/50">Total Balance</div>
            <div className="font-display text-3xl text-sand mt-2">
              {balance !== undefined ? formatUnits(balance, 6) : "—"} {symbol ?? "USDC"}
            </div>
            <div className="font-mono text-[11px] text-sand/40 mt-1">
              {account.address.slice(0, 8)}…{account.address.slice(-6)}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setPanel(panel === "deposit" ? "none" : "deposit")}
                className="focus-ring rounded-full bg-teal-800 text-sand font-medium py-3 hover:bg-teal-700 transition-colors"
              >
                Deposit
              </button>
              <button
                onClick={() => setPanel(panel === "withdraw" ? "none" : "withdraw")}
                className="focus-ring rounded-full border border-sand/20 text-sand font-medium py-3 hover:border-gold-500/40 transition-colors"
              >
                Withdraw
              </button>
            </div>
          </div>

          {panel === "deposit" && (
            <div className="mt-4 rounded-xl border border-teal-700/40 bg-teal-800/10 p-5">
              <div className="font-mono text-xs uppercase tracking-wide text-teal-700 mb-3">
                Receive USDC
              </div>
              <p className="text-sand/60 text-sm mb-3">
                Send USDC (Arc Testnet) to this address, or claim free testnet USDC from the faucet.
              </p>
              <div className="rounded-lg bg-indigo-950/60 border border-sand/10 p-3 font-mono text-xs text-sand break-all">
                {account.address}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCopy}
                  className="focus-ring flex-1 rounded-full bg-gold-500 text-indigo-950 font-medium py-2.5 text-sm hover:bg-gold-400"
                >
                  {copied ? "Copied ✓" : "Copy address"}
                </button>
                <a
                  href="https://thirdweb.com/arc-testnet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring flex-1 text-center rounded-full border border-sand/20 text-sand py-2.5 text-sm hover:border-gold-500/40"
                >
                  Open faucet
                </a>
              </div>
            </div>
          )}

          {panel === "withdraw" && (
            <form onSubmit={handleWithdraw} className="mt-4 rounded-xl border border-sand/10 bg-indigo-800/40 p-5 space-y-4">
              <div className="font-mono text-xs uppercase tracking-wide text-sand/50">
                Send USDC to another address
              </div>
              <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-wide text-sand/50">Recipient address</span>
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  className="input-field mt-2"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-wide text-sand/50">Amount (USDC)</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  className="input-field mt-2"
                />
              </label>
              {error && <p className="text-red-400 text-xs break-words">{error.message}</p>}
              <button
                type="submit"
                disabled={isPending || !recipient || !amount}
                className="focus-ring w-full rounded-full bg-gold-500 text-indigo-950 font-medium py-3 hover:bg-gold-400 disabled:opacity-40"
              >
                {isPending ? "Sending..." : isSuccess ? "Sent ✓" : "Send"}
              </button>
            </form>
          )}

          <div className="mt-8">
            <div className="font-mono text-xs uppercase tracking-wide text-sand/40 mb-3">{t("transactionHistory")}</div>
            <Link
              href="/activity"
              className="focus-ring block rounded-xl border border-dashed border-sand/15 p-6 text-center text-sand/50 text-sm hover:border-gold-500/40"
            >
              View your full activity — contributions, payouts, and stake claims →
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
