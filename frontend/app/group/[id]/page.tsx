"use client";

import { useEffect, useMemo } from "react";
import { formatUnits } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Header } from "@/components/Header";
import { RotationWheel } from "@/components/RotationWheel";
import {
  ROSCA_ABI,
  ROSCA_CONTRACT_ADDRESS,
  ERC20_ABI,
} from "@/lib/contract";
import {
  useGroup,
  useMembers,
  useRoundStatus,
  useTokenDecimals,
  useTokenSymbol,
} from "@/lib/hooks";

export default function GroupDetail({ params }: { params: { id: string } }) {
  const groupId = Number(params.id);
  const { address } = useAccount();

  const { data: groupData, refetch: refetchGroup } = useGroup(groupId);
  const { data: members, refetch: refetchMembers } = useMembers(groupId);

  const [
    admin,
    token,
    contributionAmount,
    maxMembers,
    cycleDuration,
    roundStartTime,
    currentRound,
    active,
    finished,
    potThisRound,
    memberCount,
  ] = (groupData as any) || [];

  const { data: roundStatus, refetch: refetchRound } = useRoundStatus(
    groupId,
    currentRound !== undefined ? Number(currentRound) : 0
  );

  const decimals = useTokenDecimals(token as `0x${string}`);
  const symbol = useTokenSymbol(token as `0x${string}`);
  const dec = decimals.data ?? 6;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: token as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, ROSCA_CONTRACT_ADDRESS] : undefined,
    query: { enabled: !!address && !!token },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  function refetchAll() {
    refetchGroup();
    refetchMembers();
    refetchRound();
    refetchAllowance();
  }

  useEffect(() => {
    if (isConfirmed) refetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed]);

  const isMemberHere = useMemo(
    () => !!members && !!address && (members as string[]).some((m) => m.toLowerCase() === address.toLowerCase()),
    [members, address]
  );

  const needsApproval = allowance !== undefined && contributionAmount !== undefined && (allowance as bigint) < contributionAmount;

  const wheelMembers = useMemo(() => {
    if (!members) return [];
    return (members as string[]).map((m, i) => ({
      address: m,
      contributed: roundStatus ? (roundStatus as boolean[])[i] : false,
    }));
  }, [members, roundStatus]);

  const deadline = roundStartTime && cycleDuration ? Number(roundStartTime) + Number(cycleDuration) : 0;
  const deadlinePassed = deadline > 0 && Date.now() / 1000 >= deadline;
  const everyoneContributed = roundStatus ? (roundStatus as boolean[]).every(Boolean) : false;

  if (!groupData) {
    return (
      <main className="max-w-2xl mx-auto pb-24">
        <Header />
        <div className="px-6 md:px-10 mt-10 text-sand/50">Ana lodawa...</div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto pb-24">
      <Header />

      <section className="px-6 md:px-10 mt-4">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-gold-500">Rukuni #{groupId}</p>
        <h1 className="font-display italic text-3xl text-sand mt-2">
          {formatUnits(contributionAmount, dec)} {symbol.data ?? "USDC"} / zagaye
        </h1>
        <p className="text-sand/50 font-mono text-sm mt-2">
          Admin: {shortAddr(admin)} · {memberCount?.toString()}/{maxMembers?.toString()} mambobi
        </p>
      </section>

      <section className="mt-8 flex justify-center">
        <RotationWheel
          members={wheelMembers}
          currentRound={Number(currentRound ?? 0)}
          finished={!!finished}
        />
      </section>

      <section className="px-6 md:px-10 mt-8 space-y-3">
        {!active && (
          <StatusBanner tone="teal">
            Ana jiran mambobi su cika. {maxMembers?.toString()} ana buƙata, {memberCount?.toString()} sun shiga.
          </StatusBanner>
        )}
        {active && !finished && (
          <StatusBanner tone="gold">
            Kudin da aka tara a wannan zagaye: {formatUnits(potThisRound ?? 0n, dec)} {symbol.data ?? "USDC"}
            {deadlinePassed ? " · Lokaci ya kare, ana iya biya." : ""}
          </StatusBanner>
        )}
        {finished && <StatusBanner tone="teal">Wannan rukunin ya kammala zagayensa duka. Na gode!</StatusBanner>}

        <div className="flex flex-col gap-3 pt-4">
          {!active && !isMemberHere && (
            <ActionButton
              disabled={!address || isPending || isConfirming}
              onClick={() =>
                writeContract({
                  address: ROSCA_CONTRACT_ADDRESS,
                  abi: ROSCA_ABI,
                  functionName: "joinGroup",
                  args: [BigInt(groupId)],
                })
              }
            >
              Shiga wannan rukuni
            </ActionButton>
          )}

          {active && !finished && isMemberHere && needsApproval && (
            <ActionButton
              disabled={isPending || isConfirming}
              onClick={() =>
                writeContract({
                  address: token as `0x${string}`,
                  abi: ERC20_ABI,
                  functionName: "approve",
                  args: [ROSCA_CONTRACT_ADDRESS, contributionAmount],
                })
              }
            >
              Ba da izinin token (approve)
            </ActionButton>
          )}

          {active && !finished && isMemberHere && !needsApproval && (
            <ActionButton
              disabled={isPending || isConfirming}
              onClick={() =>
                writeContract({
                  address: ROSCA_CONTRACT_ADDRESS,
                  abi: ROSCA_ABI,
                  functionName: "contribute",
                  args: [BigInt(groupId)],
                })
              }
            >
              Biya gudummawa
            </ActionButton>
          )}

          {active && !finished && (everyoneContributed || deadlinePassed) && (
            <ActionButton
              variant="secondary"
              disabled={isPending || isConfirming}
              onClick={() =>
                writeContract({
                  address: ROSCA_CONTRACT_ADDRESS,
                  abi: ROSCA_ABI,
                  functionName: "payout",
                  args: [BigInt(groupId)],
                })
              }
            >
              Aika biyan kuɗi zuwa mai karɓa
            </ActionButton>
          )}
        </div>
      </section>
    </main>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`focus-ring w-full rounded-full font-medium px-6 py-3 transition-colors disabled:opacity-40 ${
        variant === "primary"
          ? "bg-gold-500 text-indigo-950 hover:bg-gold-400"
          : "bg-transparent border border-teal-700 text-sand hover:bg-teal-800/40"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBanner({ children, tone }: { children: React.ReactNode; tone: "gold" | "teal" }) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm font-mono ${
        tone === "gold" ? "border-gold-500/30 text-gold-400 bg-gold-500/5" : "border-teal-700/40 text-teal-700 bg-teal-800/10"
      }`}
    >
      {children}
    </div>
  );
}

function shortAddr(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
