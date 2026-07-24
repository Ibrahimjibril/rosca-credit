"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { useGroup, useTokenDecimals, useTokenSymbol } from "@/lib/hooks";

export function GroupCard({ groupId }: { groupId: number }) {
  const { data, isLoading } = useGroup(groupId);

  if (isLoading || !data) {
    return (
      <div className="rounded-xl border border-sand/10 bg-indigo-800/40 p-5 animate-pulse h-32" />
    );
  }

  const [
    admin,
    token,
    contributionAmount,
    maxMembers,
    cycleDuration,
    ,
    currentRound,
    active,
    finished,
    ,
    memberCount,
  ] = data as readonly [
    string, string, bigint, bigint, bigint, bigint, bigint, boolean, boolean, bigint, bigint
  ];

  const decimals = useTokenDecimals(token as `0x${string}`);
  const symbol = useTokenSymbol(token as `0x${string}`);
  const dec = decimals.data ?? 6;
  const displayAmount = formatUnits(contributionAmount, dec);

  const status = finished ? "An kammala" : active ? "Ana gudana" : "Ana jira mambobi";
  const statusColor = finished ? "text-sand/50" : active ? "text-gold-400" : "text-teal-700";

  return (
    <Link
      href={`/group/${groupId}`}
      className="focus-ring block rounded-xl border border-sand/10 bg-indigo-800/40 p-5 hover:border-gold-500/40 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-sand/50">Rukuni #{groupId}</span>
        <span className={`font-mono text-[11px] uppercase tracking-wide ${statusColor}`}>{status}</span>
      </div>
      <div className="mt-3 font-display text-xl text-sand">
        {displayAmount} {symbol.data ?? "USDC"} <span className="text-sand/40 text-base">/ zagaye</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-sand/60 font-mono">
        <span>{memberCount.toString()}/{maxMembers.toString()} mambobi</span>
        {active && !finished && <span>Zagaye {(currentRound + 1n).toString()}</span>}
      </div>
    </Link>
  );
}
