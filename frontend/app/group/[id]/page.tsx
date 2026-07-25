"use client";

import { useMemo } from "react";
import { formatUnits } from "@/lib/units";
import { prepareContractCall } from "thirdweb";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { RotationWheel } from "@/components/RotationWheel";
import { roscaContract, tokenContract, useGroup, useGroupStaking, useMembers, useRoundStatus, useStakeInfo, useTokenDecimals, useTokenSymbol } from "@/lib/hooks";

export default function GroupDetail({ params }: { params: { id: string } }) {
  const groupId = Number(params.id);
  const account = useActiveAccount();

  const { data: groupData, refetch: refetchGroup } = useGroup(groupId);
  const { data: stakingData, refetch: refetchStaking } = useGroupStaking(groupId);
  const { data: members, refetch: refetchMembers } = useMembers(groupId);

  const [
    admin, token, contributionAmount, maxMembers, cycleDuration, roundStartTime,
    currentRound, active, finished, potThisRound, memberCount,
  ] = (groupData as any) || [];

  const [payoutBps, rewardRateBps] = (stakingData as any) || [3000, 500, 0n];

  const { data: roundStatus, refetch: refetchRound } = useRoundStatus(groupId, currentRound !== undefined ? Number(currentRound) : 0);
  const { data: stakeInfo, refetch: refetchStake } = useStakeInfo(groupId, account?.address);

  const decimals = useTokenDecimals(token as `0x${string}`);
  const symbol = useTokenSymbol(token as `0x${string}`);
  const dec = decimals.data ?? 6;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    contract: tokenContract(token as `0x${string}`),
    method: "allowance",
    params: [account?.address ?? "0x0000000000000000000000000000000000000000", roscaContract.address],
    queryOptions: { enabled: !!account && !!token },
  });

  const { mutate: sendTx, isPending } = useSendTransaction();

  function refetchAll() {
    refetchGroup(); refetchStaking(); refetchMembers(); refetchRound(); refetchAllowance(); refetchStake();
  }

  const isMemberHere = useMemo(
    () => !!members && !!account && (members as string[]).some((m) => m.toLowerCase() === account.address.toLowerCase()),
    [members, account]
  );

  const needsApproval = allowance !== undefined && contributionAmount !== undefined && (allowance as bigint) < contributionAmount;

  const wheelMembers = useMemo(() => {
    if (!members) return [];
    return (members as string[]).map((m, i) => ({ address: m, contributed: roundStatus ? (roundStatus as boolean[])[i] : false }));
  }, [members, roundStatus]);

  const deadline = roundStartTime && cycleDuration ? Number(roundStartTime) + Number(cycleDuration) : 0;
  const deadlinePassed = deadline > 0 && Date.now() / 1000 >= deadline;
  const everyoneContributed = roundStatus ? (roundStatus as boolean[]).every(Boolean) : false;

  const [stakedPrincipal, pendingReward] = (stakeInfo as any) ?? [0n, 0n];

  if (!groupData) {
    return <main className="max-w-2xl mx-auto px-5 md:px-8 py-10 text-sand/50">Loading...</main>;
  }

  return (
    <main className="max-w-2xl mx-auto px-5 md:px-8 py-6">
      <p className="font-mono text-xs tracking-[0.2em] uppercase text-gold-500">Group #{groupId}</p>
      <h1 className="font-display italic text-3xl text-sand mt-2">
        {formatUnits(contributionAmount, dec)} {symbol.data ?? "USDC"} / round
      </h1>
      <p className="text-sand/50 font-mono text-sm mt-2">
        Admin: {shortAddr(admin)} · {memberCount?.toString()}/{maxMembers?.toString()} members ·{" "}
        {Number(payoutBps) / 100}% instant / {100 - Number(payoutBps) / 100}% staked
      </p>

      <section className="mt-8 flex justify-center">
        <RotationWheel members={wheelMembers} currentRound={Number(currentRound ?? 0)} finished={!!finished} />
      </section>

      <section className="mt-8 space-y-3">
        {!active && (
          <StatusBanner tone="teal">
            Waiting for members to join. {maxMembers?.toString()} needed, {memberCount?.toString()} joined so far.
          </StatusBanner>
        )}
        {active && !finished && (
          <StatusBanner tone="gold">
            Pot collected this round: {formatUnits(potThisRound ?? 0n, dec)} {symbol.data ?? "USDC"}
            {deadlinePassed ? " · Round deadline passed, settlement can be triggered." : ""}
          </StatusBanner>
        )}
        {finished && <StatusBanner tone="teal">This group has completed all its rounds. Thank you!</StatusBanner>}

        {isMemberHere && (stakedPrincipal > 0n || pendingReward > 0n) && (
          <div className="rounded-lg border border-gold-500/20 bg-gold-500/5 p-4">
            <div className="font-mono text-xs uppercase text-gold-400">Your stake in this group</div>
            <div className="font-display text-xl text-sand mt-1">
              {formatUnits(stakedPrincipal, dec)} {symbol.data ?? "USDC"}
            </div>
            <div className="font-mono text-xs text-sand/50 mt-1">
              + {formatUnits(pendingReward, dec)} {symbol.data ?? "USDC"} reward accrued
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4">
          {!active && !isMemberHere && (
            <ActionButton
              disabled={!account || isPending}
              onClick={() => sendTx(prepareContractCall({ contract: roscaContract, method: "joinGroup", params: [BigInt(groupId)] }) as any, { onSuccess: refetchAll })}
            >
              Join this group
            </ActionButton>
          )}

          {active && !finished && isMemberHere && needsApproval && (
            <ActionButton
              disabled={isPending}
              onClick={() => sendTx(prepareContractCall({ contract: tokenContract(token as `0x${string}`), method: "approve", params: [roscaContract.address, contributionAmount] }) as any, { onSuccess: refetchAll })}
            >
              Approve token spending
            </ActionButton>
          )}

          {active && !finished && isMemberHere && !needsApproval && (
            <ActionButton
              disabled={isPending}
              onClick={() => sendTx(prepareContractCall({ contract: roscaContract, method: "contribute", params: [BigInt(groupId)] }) as any, { onSuccess: refetchAll })}
            >
              Make contribution
            </ActionButton>
          )}

          {active && !finished && (everyoneContributed || deadlinePassed) && (
            <ActionButton
              variant="secondary"
              disabled={isPending}
              onClick={() => sendTx(prepareContractCall({ contract: roscaContract, method: "settleRound", params: [BigInt(groupId)] }) as any, { onSuccess: refetchAll })}
            >
              Settle round & send payout
            </ActionButton>
          )}

          {finished && isMemberHere && (stakedPrincipal > 0n || pendingReward > 0n) && (
            <ActionButton
              disabled={isPending}
              onClick={() => sendTx(prepareContractCall({ contract: roscaContract, method: "claimStake", params: [BigInt(groupId)] }) as any, { onSuccess: refetchAll })}
            >
              Claim stake + reward
            </ActionButton>
          )}
        </div>
      </section>
    </main>
  );
}

function ActionButton({ children, onClick, disabled, variant = "primary" }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; variant?: "primary" | "secondary" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`focus-ring w-full rounded-full font-medium px-6 py-3 transition-colors disabled:opacity-40 ${
        variant === "primary" ? "bg-gold-500 text-indigo-950 hover:bg-gold-400" : "bg-transparent border border-teal-700 text-sand hover:bg-teal-800/40"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBanner({ children, tone }: { children: React.ReactNode; tone: "gold" | "teal" }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-mono ${tone === "gold" ? "border-gold-500/30 text-gold-400 bg-gold-500/5" : "border-teal-700/40 text-teal-700 bg-teal-800/10"}`}>
      {children}
    </div>
  );
}

function shortAddr(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
