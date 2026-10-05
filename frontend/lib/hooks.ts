"use client";

import { getContract, readContract } from "thirdweb";
import { useReadContract } from "thirdweb/react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { client } from "@/lib/thirdwebClient";
import { useNetwork } from "@/contexts/NetworkContext";
import { ROSCA_ABI, ERC20_ABI } from "@/lib/contract";

export function useRoscaContract() {
  const { chain, roscaAddress } = useNetwork();
  return useMemo(
    () => getContract({ client, chain, address: roscaAddress, abi: ROSCA_ABI as any }),
    [chain, roscaAddress]
  );
}

export function useTokenContract(token: `0x${string}`) {
  const { chain } = useNetwork();
  return useMemo(
    () => getContract({ client, chain, address: token, abi: ERC20_ABI as any }),
    [chain, token]
  );
}

const POLL = { refetchInterval: 8000, staleTime: 0 };

export function useGroupCount() {
  const contract = useRoscaContract();
  return useReadContract({ contract, method: "groupCount", params: [], queryOptions: POLL });
}

export function useGroup(groupId: number) {
  const contract = useRoscaContract();
  return useReadContract({
    contract,
    method: "getGroup",
    params: [BigInt(groupId)],
    queryOptions: POLL,
  });
}

export function useGroupStaking(groupId: number) {
  const contract = useRoscaContract();
  return useReadContract({
    contract,
    method: "getGroupStaking",
    params: [BigInt(groupId)],
    queryOptions: POLL,
  });
}

export function useGroupName(groupId: number) {
  const contract = useRoscaContract();
  return useReadContract({
    contract,
    method: "getGroupName",
    params: [BigInt(groupId)],
  });
}

export function useMembers(groupId: number) {
  const contract = useRoscaContract();
  return useReadContract({
    contract,
    method: "getMembers",
    params: [BigInt(groupId)],
    queryOptions: POLL,
  });
}

export function useRoundStatus(groupId: number, round: number) {
  const contract = useRoscaContract();
  return useReadContract({
    contract,
    method: "getRoundStatus",
    params: [BigInt(groupId), BigInt(round)],
    queryOptions: POLL,
  });
}

export function useStakeInfo(groupId: number, member?: string) {
  const contract = useRoscaContract();
  const [data, setData] = useState<readonly [bigint, bigint, bigint] | undefined>(undefined);

  const fetchData = useCallback(async () => {
    if (!member) return;
    try {
      const result = await readContract({
        contract,
        method: "getStakeInfo",
        params: [BigInt(groupId), member as `0x${string}`],
      });
      setData(result as any);
    } catch {
      // leave previous data in place; next poll retries
    }
  }, [contract, groupId, member]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 8000);
    return () => clearInterval(id);
  }, [fetchData]);

  return { data, refetch: fetchData };
}

export function useTokenDecimals(token: `0x${string}`) {
  const contract = useTokenContract(token);
  return useReadContract({
    contract,
    method: "decimals",
    params: [],
    queryOptions: { enabled: !!token && token !== "0x0000000000000000000000000000000000000000" },
  });
}

export function useTokenSymbol(token: `0x${string}`) {
  const contract = useTokenContract(token);
  return useReadContract({
    contract,
    method: "symbol",
    params: [],
    queryOptions: { enabled: !!token && token !== "0x0000000000000000000000000000000000000000" },
  });
}

export function useTokenBalance(token: `0x${string}`, owner?: string) {
  const contract = useTokenContract(token);
  return useReadContract({
    contract,
    method: "balanceOf",
    params: [(owner ?? "0x0000000000000000000000000000000000000000") as `0x${string}`],
    queryOptions: { enabled: !!owner, ...POLL },
  });
}
