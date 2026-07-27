"use client";

import Link from "next/link";
import { formatUnits } from "@/lib/units";
import { useGroup, useGroupStaking, useGroupName, useTokenDecimals, useTokenSymbol } from "@/lib/hooks";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export function GroupCard({ groupId }: { groupId: number }) {
  const { data, isLoading } = useGroup(groupId);
  const { data: staking } = useGroupStaking(groupId);
  const { data: name } = useGroupName(groupId);

  // Read the token address defensively (data may be undefined while loading),
  // and call every hook unconditionally — never after an early return —
  // to avoid a "Rendered more hooks than during the previous render" crash.
  const token = ((data as any)?.[1] as `0x${string}` | undefined) ?? ZERO_ADDRESS;
  const decimals = useTokenDecimals(token);
  const symbol = useTokenSymbol(token);

  if (isLoading || !data) {
    return <div className="rounded-xl border border-sand/10 bg-indigo-800/40 p-5 animate-pulse h-32" />;
  }

  const [
    admin,
    ,
    contributionAmount,
    maxMembers,
    ,
    ,
    currentRound,
    active,
    finished,
    ,
    memberCount,
  ] = data as readonly [
    string, string, bigint, bigint, bigint, bigint, bigint, boolean, boolean, bigint, bigint
  ];

  const [payoutBps] = (staking as readonly [number, number, bigint]) ?? [3000, 0, 0n];

  const dec = decimals.data ?? 6;
  const displayAmount = formatUnits(contributionAmount, dec);

  const status = finished ? "Completed" : active ? "In progress" : "Waiting for members";
  const statusColor = finished ? "text-sand/50" : active ? "text-gold-400" : "text-teal-700";

  return (
    <Link
      href={`/group/${groupId}`}
      className="focus-ring block rounded-xl border border-sand/10 bg-indigo-800/40 p-5 hover:border-gold-500/40 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-sand/50">
          {name && name !== "" ? name : `Group #${groupId}`}
        </span>
        <span className={`font-mono text-[11px] uppercase tracking-wide ${statusColor}`}>{status}</span>
      </div>
      <div className="mt-3 font-display text-xl text-sand">
        {displayAmount} {symbol.data ?? "USDC"} <span className="text-sand/40 text-base">/ round</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-sand/60 font-mono">
        <span>{memberCount.toString()}/{maxMembers.toString()} members</span>
        {active && !finished && <span>Round {(currentRound + 1n).toString()}</span>}
      </div>
      <div className="mt-2 text-[11px] font-mono text-sand/40">
        {Number(payoutBps) / 100}% instant · {100 - Number(payoutBps) / 100}% staked
      </div>
    </Link>
  );
}
