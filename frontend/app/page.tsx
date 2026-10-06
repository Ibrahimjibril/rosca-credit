"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatUnits } from "@/lib/units";
import { prepareContractCall } from "thirdweb";
import { useActiveAccount, useProfiles, useSendTransaction } from "thirdweb/react";
import { StatCard } from "@/components/StatCard";
import { GroupCard } from "@/components/GroupCard";
import { GroupStatsCollector, GroupStat } from "@/components/GroupStatsCollector";
import { LandingPage } from "@/components/LandingPage";
import { NetworkSwitcher } from "@/components/NetworkSwitcher";
import { ClaimSuccessModal } from "@/components/ClaimSuccessModal";
import { useGroupCount, useTokenBalance, useRoscaContract } from "@/lib/hooks";
import { useNetwork } from "@/contexts/NetworkContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { client } from "@/lib/thirdwebClient";
import { getGreeting } from "@/lib/greeting";

export default function Home() {
  const account = useActiveAccount();
  const { t } = useLanguage();
  const roscaContract = useRoscaContract();
  const { tokenAddress } = useNetwork();
  const { data: groupCount } = useGroupCount();
  const { data: walletBalance } = useTokenBalance(tokenAddress, account?.address);
  const { data: profiles } = useProfiles({ client });

  const { mutate: sendTx, isPending: isClaiming } = useSendTransaction();
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [successAmount, setSuccessAmount] = useState<string | null>(null);

  const googleProfile = profiles?.find((p: any) => p.type === "google") as any;
  const displayName =
    googleProfile?.details?.name ||
    googleProfile?.details?.email?.split("@")[0] ||
    (account ? `${account.address.slice(0, 6)}…${account.address.slice(-4)}` : "");

  const greeting = getGreeting(displayName || undefined);

  const count = groupCount ? Number(groupCount) : 0;
  const allIds = Array.from({ length: count }, (_, i) => count - 1 - i);

  const [stats, setStats] = useState<Record<number, GroupStat>>({});
  const handleData = useCallback((stat: GroupStat) => {
    setStats((prev) => ({ ...prev, [stat.groupId]: stat }));
  }, []);

  const myGroups = Object.values(stats);
  const activeGroups = myGroups.filter((g) => g.active && !g.finished);
  const totalStaked = myGroups.reduce((sum, g) => sum + g.staked, 0n);
  const totalReward = myGroups.reduce((sum, g) => sum + g.pendingReward, 0n);

  const claimableGroups = myGroups
    .filter((g) => g.staked > 0n || g.pendingReward > 0n)
    .sort((a, b) => b.groupId - a.groupId);

  const readyToClaimCount = claimableGroups.filter((g) => g.finished && g.shortfall === 0n).length;

  function handleClaim(groupId: number, amount: bigint, decimals: number) {
    if (!account) return;
    setClaimingId(groupId);
    sendTx(
      prepareContractCall({ contract: roscaContract, method: "claimStake", params: [BigInt(groupId)] }) as any,
      {
        onSuccess: () => {
          setSuccessAmount(formatUnits(amount, decimals));
        },
        onSettled: () => setClaimingId(null),
      }
    );
  }

  if (!account) {
    return <LandingPage />;
  }

  return (
    <main className="max-w-5xl mx-auto px-5 md:px-8 py-6">
      {successAmount && (
        <ClaimSuccessModal amount={successAmount} symbol="USDC" onClose={() => setSuccessAmount(null)} />
      )}

      {account && allIds.map((id) => (
        <GroupStatsCollector key={id} groupId={id} account={account.address} onData={handleData} />
      ))}

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="font-display font-bold text-2xl text-sand">
            {greeting} 👋
          </h1>
          <p className="text-sand/50 text-sm mt-1">Here's what's happening with your savings today.</p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-sand/10 bg-indigo-800/40 p-4">
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-wide text-sand/40">Wallet</div>
          <div className="font-mono text-xs text-sand/60 mt-0.5">
            {account.address.slice(0, 8)}…{account.address.slice(-6)}
          </div>
        </div>
        <div className="shrink-0 w-52">
          <NetworkSwitcher />
        </div>
      </div>

      {readyToClaimCount > 0 && (
        <a
          href="#your-stakes"
          className="focus-ring mb-6 flex items-center justify-between gap-3 rounded-xl border-2 border-gold-500/50 bg-gold-500/10 px-4 py-3 hover:bg-gold-500/15 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>💰</span>
            <span className="text-sm text-gold-400 font-medium">
              {readyToClaimCount} stake{readyToClaimCount > 1 ? "s" : ""} ready to claim
            </span>
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wide text-gold-400">Claim now →</span>
        </a>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon="$"
              label={t("walletBalance")}
              value={walletBalance ? `${formatUnits(walletBalance, 6)} USDC` : "—"}
            />
            <StatCard
              icon="💰"
              label={t("stakingBalance")}
              value={`${formatUnits(totalStaked, 6)} USDC`}
            sub={totalStaked > 0n ? "Across all groups" : "Earned after your payout turn"}
              accent="teal"
              claimHref={totalStaked > 0n ? "#your-stakes" : undefined}
            />
            <StatCard
              icon="👥"
              label={t("activeGroups")}
              value={String(activeGroups.length)}
              sub="You are a member"
            />
            <StatCard
              icon="🎁"
              label={t("stakingReward")}
              value={`${formatUnits(totalReward, 6)} USDC`}
              sub="Pending, claimable at finish"
              accent="teal"
              claimHref={totalReward > 0n ? "#your-stakes" : undefined}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-3 mt-6">
            <div className="md:col-span-2 rounded-xl border border-sand/10 bg-indigo-800/40 p-5">
              <div className="font-mono text-xs uppercase tracking-wide text-sand/50">Quick actions</div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Link href="/create" className="focus-ring flex flex-col items-center gap-2 rounded-lg border border-sand/10 py-4 hover:border-gold-500/40">
                  <span className="w-10 h-10 rounded-full bg-gold-500 text-indigo-950 flex items-center justify-center text-lg">+</span>
                  <span className="text-xs text-sand/70">{t("createGroup")}</span>
                </Link>
                <Link href="/groups" className="focus-ring flex flex-col items-center gap-2 rounded-lg border border-sand/10 py-4 hover:border-gold-500/40">
                  <span className="w-10 h-10 rounded-full bg-teal-800 text-sand flex items-center justify-center text-lg">👥</span>
                  <span className="text-xs text-sand/70">{t("groups")}</span>
                </Link>
              </div>
            </div>
            <div className="rounded-xl border border-sand/10 bg-indigo-800/40 p-5">
              <div className="font-mono text-xs uppercase tracking-wide text-sand/50">How staking works</div>
              <p className="text-xs text-sand/60 mt-3 leading-relaxed">
                When your turn comes, you get 30% of the pot right away. The other 70% earns reward while
                staked, until the group finishes — then you claim it all. Miss a payment and it's covered
                automatically from your stake.
              </p>
            </div>
          </div>

      {claimableGroups.length > 0 && (
        <div id="your-stakes" className="mt-8 scroll-mt-20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-sand/40">Your Stakes</h2>
          </div>
          <div className="space-y-3">
            {claimableGroups.map((g) => {
              const hasShortfall = g.shortfall > 0n;
              const readyToClaim = g.finished && !hasShortfall;
              const amount = g.staked + g.pendingReward;
              const isThisPending = isClaiming && claimingId === g.groupId;

              return (
                <div
                  key={g.groupId}
                  className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${
                    readyToClaim
                      ? "border-gold-500/30 bg-gold-500/5"
                      : "border-sand/10 bg-indigo-800/40"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-sand/50">Group #{g.groupId}</div>
                    <div className="font-display text-lg text-sand mt-0.5">
                      {formatUnits(amount, g.decimals)} USDC
                    </div>
                    <div className="text-xs text-sand/40 mt-0.5">
                      {hasShortfall
                        ? "Outstanding shortfall must be paid first"
                        : g.finished
                        ? "Ready to claim"
                        : "Locked until the group finishes"}
                    </div>
                  </div>

                  {hasShortfall ? (
                    <Link
                      href={`/group/${g.groupId}`}
                      className="focus-ring shrink-0 rounded-full border border-red-400/40 text-red-300 text-sm font-medium px-5 py-2.5 hover:bg-red-500/10"
                    >
                      Resolve
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleClaim(g.groupId, amount, g.decimals)}
                      disabled={!readyToClaim || isThisPending}
                      className={`focus-ring shrink-0 flex items-center gap-2 rounded-full text-sm font-medium px-5 py-2.5 transition-colors ${
                        readyToClaim
                          ? "bg-gold-500 text-indigo-950 hover:bg-gold-400"
                          : "bg-transparent border border-sand/15 text-sand/30 cursor-not-allowed"
                      }`}
                    >
                      {isThisPending && (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-950/40 border-t-indigo-950 animate-spin" />
                      )}
                      {isThisPending ? "Claiming..." : readyToClaim ? "Claim" : "Locked"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-sand/40">My Groups</h2>
          <Link href="/groups" className="text-xs text-gold-500 font-mono">View all</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {allIds.slice(0, 3).map((id) => (
            <GroupCard key={id} groupId={id} />
          ))}
          {count === 0 && (
            <div className="md:col-span-3 rounded-xl border border-dashed border-sand/15 p-8 text-center text-sand/50">
              No groups yet. <Link href="/create" className="text-gold-500 underline">Create the first one</Link>.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
