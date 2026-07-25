"use client";

import { getContract } from "thirdweb";
import { useReadContract } from "thirdweb/react";
import { client } from "@/lib/thirdwebClient";
import { arcTestnet } from "@/lib/chain";
import { ROSCA_ABI, ROSCA_CONTRACT_ADDRESS, ERC20_ABI } from "@/lib/contract";

export const roscaContract = getContract({
  client,
  chain: arcTestnet,
  address: ROSCA_CONTRACT_ADDRESS,
  abi: ROSCA_ABI as any,
});

export function tokenContract(token: `0x${string}`) {
  return getContract({ client, chain: arcTestnet, address: token, abi: ERC20_ABI as any });
}

export function useGroupCount() {
  return useReadContract({ contract: roscaContract, method: "groupCount", params: [] });
}

export function useGroup(groupId: number) {
  return useReadContract({
    contract: roscaContract,
    method: "getGroup",
    params: [BigInt(groupId)],
  });
}

export function useMembers(groupId: number) {
  return useReadContract({
    contract: roscaContract,
    method: "getMembers",
    params: [BigInt(groupId)],
  });
}

export function useRoundStatus(groupId: number, round: number) {
  return useReadContract({
    contract: roscaContract,
    method: "getRoundStatus",
    params: [BigInt(groupId), BigInt(round)],
  });
}

export function useStakeInfo(groupId: number, member?: string) {
  return useReadContract({
    contract: roscaContract,
    method: "getStakeInfo",
    params: [BigInt(groupId), (member ?? "0x0000000000000000000000000000000000000000") as `0x${string}`],
    queryOptions: { enabled: !!member },
  });
}

export function useTokenDecimals(token: `0x${string}`) {
  return useReadContract({
    contract: tokenContract(token),
    method: "decimals",
    params: [],
    queryOptions: { enabled: !!token && token !== "0x0000000000000000000000000000000000000000" },
  });
}

export function useTokenSymbol(token: `0x${string}`) {
  return useReadContract({
    contract: tokenContract(token),
    method: "symbol",
    params: [],
    queryOptions: { enabled: !!token && token !== "0x0000000000000000000000000000000000000000" },
  });
}

export function useTokenBalance(token: `0x${string}`, owner?: string) {
  return useReadContract({
    contract: tokenContract(token),
    method: "balanceOf",
    params: [(owner ?? "0x0000000000000000000000000000000000000000") as `0x${string}`],
    queryOptions: { enabled: !!owner },
  });
}
