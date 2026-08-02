"use client";

import { useEffect } from "react";
import { useGroup, useStakeInfo } from "@/lib/hooks";

export type GroupStat = {
  groupId: number;
  isMember: boolean;
  active: boolean;
  finished: boolean;
  staked: bigint;
  pendingReward: bigint;
  decimals: number;
};

/** Renders nothing — just reads one group's on-chain data and reports it
 *  up to the parent via onData, so the dashboard can aggregate totals
 *  across every group the connected account belongs to.
 *
 *  Note: we report stake/reward whenever getStakeInfo returns a nonzero
 *  value, without gating on a separate membership-array fetch — that gate
 *  previously caused real stake balances to be silently dropped if the
 *  members-array read hadn't resolved yet or raced with other reads. */
export function GroupStatsCollector({
  groupId,
  account,
  onData,
}: {
  groupId: number;
  account?: string;
  onData: (stat: GroupStat) => void;
}) {
  const { data: group } = useGroup(groupId);
  const { data: stakeInfo } = useStakeInfo(groupId, account);

  useEffect(() => {
    if (!group || !account) return;

    const [, , , , , , , active, finished] = group as any;
    const [staked, pendingReward] = (stakeInfo as any) ?? [0n, 0n];

    const hasStake = (staked ?? 0n) > 0n || (pendingReward ?? 0n) > 0n;

    onData({
      groupId,
      isMember: hasStake || !!active,
      active: !!active,
      finished: !!finished,
      staked: staked ?? 0n,
      pendingReward: pendingReward ?? 0n,
      decimals: 6,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, stakeInfo, account]);

  return null;
}
