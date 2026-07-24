"use client";

import { useReadContract } from "wagmi";
import { ROSCA_ABI, ROSCA_CONTRACT_ADDRESS, ERC20_ABI } from "@/lib/contract";

export function useGroupCount() {
  return useReadContract({
    address: ROSCA_CONTRACT_ADDRESS,
    abi: ROSCA_ABI,
    functionName: "groupCount",
  });
}

export function useGroup(groupId: number) {
  return useReadContract({
    address: ROSCA_CONTRACT_ADDRESS,
    abi: ROSCA_ABI,
    functionName: "getGroup",
    args: [BigInt(groupId)],
  });
}

export function useMembers(groupId: number) {
  return useReadContract({
    address: ROSCA_CONTRACT_ADDRESS,
    abi: ROSCA_ABI,
    functionName: "getMembers",
    args: [BigInt(groupId)],
  });
}

export function useRoundStatus(groupId: number, round: number) {
  return useReadContract({
    address: ROSCA_CONTRACT_ADDRESS,
    abi: ROSCA_ABI,
    functionName: "getRoundStatus",
    args: [BigInt(groupId), BigInt(round)],
  });
}

export function useTokenDecimals(token: `0x${string}`) {
  return useReadContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!token && token !== "0x0000000000000000000000000000000000000000" },
  });
}

export function useTokenSymbol(token: `0x${string}`) {
  return useReadContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: !!token && token !== "0x0000000000000000000000000000000000000000" },
  });
}
