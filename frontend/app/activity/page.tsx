"use client";

import { useMemo } from "react";
import { useActiveAccount, useContractEvents } from "thirdweb/react";
import { formatUnits } from "@/lib/units";
import { useLanguage } from "@/contexts/LanguageContext";
import { roscaContract } from "@/lib/hooks";
import { contributedEvent, missedContributionEvent, roundSettledEvent, stakeClaimedEvent } from "@/lib/events";

type FeedItem = {
  key: string;
  blockNumber: bigint;
  icon: string;
  title: string;
  detail: string;
  tone: "gold" | "teal" | "red";
};

export default function ActivityPage() {
  const account = useActiveAccount();
  const { t } = useLanguage();

  const { data: contributed } = useContractEvents({ contract: roscaContract, events: [contributedEvent] });
  const { data: missed } = useContractEvents({ contract: roscaContract, events: [missedContributionEvent] });
  const { data: settled } = useContractEvents({ contract: roscaContract, events: [roundSettledEvent] });
  const { data: claimed } = useContractEvents({ contract: roscaContract, events: [stakeClaimedEvent] });

  const feed = useMemo<FeedItem[]>(() => {
    if (!account) return [];
    const me = account.address.toLowerCase();
    const items: FeedItem[] = [];

    (contributed ?? []).forEach((e: any) => {
      if (e.args?.member?.toLowerCase() !== me) return;
      items.push({
        key: `contrib-${e.transactionHash}`,
        blockNumber: e.blockNumber,
        icon: "💸",
        title: `You contributed to Group #${e.args.groupId}`,
        detail: `${formatUnits(e.args.amount, 6)} USDC · Round ${Number(e.args.round) + 1}`,
        tone: "gold",
      });
    });

    (settled ?? []).forEach((e: any) => {
      if (e.args?.recipient?.toLowerCase() !== me) return;
      items.push({
        key: `settled-${e.transactionHash}`,
        blockNumber: e.blockNumber,
        icon: "🎉",
        title: `You received a payout from Group #${e.args.groupId}`,
        detail: `${formatUnits(e.args.immediatePayout, 6)} USDC instant + ${formatUnits(e.args.stakedPortion, 6)} USDC staked · Round ${Number(e.args.round) + 1}`,
        tone: "gold",
      });
    });

    (claimed ?? []).forEach((e: any) => {
      if (e.args?.member?.toLowerCase() !== me) return;
      items.push({
        key: `claim-${e.transactionHash}`,
        blockNumber: e.blockNumber,
        icon: "🏆",
        title: `You claimed your stake from Group #${e.args.groupId}`,
        detail: `${formatUnits(e.args.principal, 6)} USDC principal + ${formatUnits(e.args.reward, 6)} USDC reward`,
        tone: "teal",
      });
    });

    (missed ?? []).forEach((e: any) => {
      if (e.args?.member?.toLowerCase() !== me) return;
      items.push({
        key: `missed-${e.transactionHash}`,
        blockNumber: e.blockNumber,
        icon: "⚠️",
        title: `Missed contribution auto-covered from your stake — Group #${e.args.groupId}`,
        detail: `${formatUnits(e.args.deductedFromStake, 6)} USDC deducted · Round ${Number(e.args.round) + 1}`,
        tone: "red",
      });
    });

    return items.sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : -1));
  }, [account, contributed, missed, settled, claimed]);

  return (
    <main className="max-w-lg mx-auto px-5 md:px-8 py-6">
      <h1 className="font-display italic text-2xl text-sand mb-6">{t("activity")}</h1>

      {!account ? (
        <div className="rounded-xl border border-dashed border-sand/15 p-10 text-center text-sand/50">
          Sign in with Google to see your activity.
        </div>
      ) : feed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sand/15 p-10 text-center text-sand/50 text-sm">
          No ROSCA activity yet — contributions, payouts, and stake claims will show up here.
        </div>
      ) : (
        <div className="space-y-3">
          {feed.map((item) => (
            <div
              key={item.key}
              className={`rounded-xl border p-4 flex items-start gap-3 ${
                item.tone === "gold"
                  ? "border-gold-500/20 bg-gold-500/5"
                  : item.tone === "red"
                  ? "border-red-400/20 bg-red-500/5"
                  : "border-teal-700/30 bg-teal-800/10"
              }`}
            >
              <span className="text-xl" aria-hidden>{item.icon}</span>
              <div className="min-w-0">
                <div className="text-sand text-sm">{item.title}</div>
                <div className="font-mono text-xs text-sand/50 mt-1">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {account && (
        <a
          href={`https://testnet.arcscan.app/address/${account.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring block text-center mt-6 text-xs text-gold-500 underline font-mono"
        >
          View full wallet history (sends & receives) on Arcscan →
        </a>
      )}
    </main>
  );
}
