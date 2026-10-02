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
  shortfall: bigint;
  decimals: number;
};

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
    const [staked, pendingReward, shortfall] = (stakeInfo as any) ?? [0n, 0n, 0n];

    const hasStake = (staked ?? 0n) > 0n || (pendingReward ?? 0n) > 0n || (shortfall ?? 0n) > 0n;

    onData({
      groupId,
      isMember: hasStake || !!active,
      active: !!active,
      finished: !!finished,
      staked: staked ?? 0n,
      pendingReward: pendingReward ?? 0n,
      shortfall: shortfall ?? 0n,
      decimals: 6,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, stakeInfo, account]);

  return null;
}
