"use client";

import { useEffect } from "react";
import { useGroup, useMembers, useStakeInfo } from "@/lib/hooks";

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
 *  across every group the connected account belongs to. */
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
  const { data: members } = useMembers(groupId);
  const { data: stakeInfo } = useStakeInfo(groupId, account);

  useEffect(() => {
    if (!group || !members || !account) return;
    const isMember = (members as string[]).some((m) => m.toLowerCase() === account.toLowerCase());
    if (!isMember) return;

    const [, , , , , , , active, finished] = group as any;
    const [staked, pendingReward] = (stakeInfo as any) ?? [0n, 0n];

    onData({
      groupId,
      isMember: true,
      active,
      finished,
      staked: staked ?? 0n,
      pendingReward: pendingReward ?? 0n,
      decimals: 6,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, members, stakeInfo, account]);

  return null;
}
