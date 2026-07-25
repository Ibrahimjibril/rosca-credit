"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { prepareContractCall } from "thirdweb";
import { toUnits } from "@/lib/units";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { roscaContract, tokenContract } from "@/lib/hooks";
import { DEFAULT_TOKEN_ADDRESS, ERC20_ABI } from "@/lib/contract";

const CYCLE_PRESETS = [
  { label: "Daily", seconds: 86400 },
  { label: "Weekly", seconds: 604800 },
  { label: "Monthly (30 days)", seconds: 2592000 },
];

export default function CreateGroup() {
  const router = useRouter();
  const account = useActiveAccount();
  const [token, setToken] = useState(DEFAULT_TOKEN_ADDRESS);
  const [amount, setAmount] = useState("10");
  const [decimals, setDecimals] = useState("6");
  const [maxMembers, setMaxMembers] = useState("5");
  const [cycleSeconds, setCycleSeconds] = useState(CYCLE_PRESETS[1].seconds);
  const [payoutPercent, setPayoutPercent] = useState("30");
  const [rewardApy, setRewardApy] = useState("5");
  const [rewardPoolDeposit, setRewardPoolDeposit] = useState("50");

  const { data: allowance } = useReadContract({
    contract: tokenContract(token as `0x${string}`),
    method: "allowance",
    params: [account?.address ?? "0x0000000000000000000000000000000000000000", roscaContract.address],
    queryOptions: { enabled: !!account },
  });

  const { mutate: sendTx, isPending, isSuccess } = useSendTransaction();

  const rewardPoolUnits = toUnits(rewardPoolDeposit || "0", Number(decimals));
  const needsApproval = !allowance || (allowance as bigint) < rewardPoolUnits;

  function handleApprove() {
    const tx = prepareContractCall({
      contract: tokenContract(token as `0x${string}`),
      method: "approve",
      params: [roscaContract.address, rewardPoolUnits],
    });
    sendTx(tx as any);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;

    const tx = prepareContractCall({
      contract: roscaContract,
      method: "createGroup",
      params: [
        token as `0x${string}`,
        toUnits(amount || "0", Number(decimals)),
        BigInt(maxMembers),
        BigInt(cycleSeconds),
        Math.round(Number(payoutPercent) * 100), // percent -> bps
        Math.round(Number(rewardApy) * 100), // percent -> bps
        rewardPoolUnits,
      ],
    });

    sendTx(tx as any, {
      onSuccess: () => setTimeout(() => router.push("/groups"), 1500),
    });
  }

  return (
    <main className="max-w-lg mx-auto px-5 md:px-8 py-6">
      <p className="font-mono text-xs tracking-[0.2em] uppercase text-gold-500">New group</p>
      <h1 className="font-display italic text-3xl text-sand mt-2">Create a Rosca_Credit group</h1>
      <p className="text-sand/60 mt-3 text-sm">
        You'll become the admin and the first member — you'll receive the payout in the first round.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Field label="Token address (ERC-20, e.g. USDC)">
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="0x..." className="input-field" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Contribution amount">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="any" className="input-field" />
          </Field>
          <Field label="Token decimals">
            <input value={decimals} onChange={(e) => setDecimals(e.target.value)} type="number" min="0" max="18" className="input-field" />
          </Field>
        </div>

        <Field label="Number of members (= number of rounds)">
          <input value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} type="number" min="2" className="input-field" />
        </Field>

        <Field label="Length of each round">
          <div className="flex gap-2 flex-wrap">
            {CYCLE_PRESETS.map((p) => (
              <button
                type="button"
                key={p.seconds}
                onClick={() => setCycleSeconds(p.seconds)}
                className={`focus-ring rounded-full px-4 py-2 text-sm border transition-colors ${
                  cycleSeconds === p.seconds ? "bg-gold-500 border-gold-400 text-indigo-950" : "border-sand/15 text-sand/70 hover:border-gold-500/40"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-4 space-y-4">
          <p className="text-xs text-gold-400 font-mono uppercase tracking-wide">Staking safety net</p>

          <Field label="Instant payout % (rest is auto-staked)">
            <input value={payoutPercent} onChange={(e) => setPayoutPercent(e.target.value)} type="number" min="0" max="100" className="input-field" />
          </Field>
          <Field label="Staking reward rate (APY %)">
            <input value={rewardApy} onChange={(e) => setRewardApy(e.target.value)} type="number" min="0" className="input-field" />
          </Field>
          <Field label="Reward pool you'll fund upfront">
            <input value={rewardPoolDeposit} onChange={(e) => setRewardPoolDeposit(e.target.value)} type="number" min="0" step="any" className="input-field" />
          </Field>
          <p className="text-[11px] text-sand/50 leading-relaxed">
            When a member's turn comes, they get {payoutPercent || 0}% right away; the other{" "}
            {100 - Number(payoutPercent || 0)}% stays staked, earning {rewardApy || 0}% APY, until the
            group finishes. Missed contributions are auto-deducted from a member's stake.
          </p>
        </div>

        {!account && <p className="text-teal-700 text-sm">Sign in with Google to continue.</p>}

        {needsApproval && Number(rewardPoolDeposit) > 0 && (
          <button
            type="button"
            onClick={handleApprove}
            disabled={!account || isPending}
            className="focus-ring w-full rounded-full border border-gold-500 text-gold-400 font-medium px-6 py-3 hover:bg-gold-500/10 disabled:opacity-40"
          >
            Approve reward pool deposit
          </button>
        )}

        <button
          type="submit"
          disabled={!account || isPending || (needsApproval && Number(rewardPoolDeposit) > 0)}
          className="focus-ring w-full rounded-full bg-gold-500 text-indigo-950 font-medium px-6 py-3 hover:bg-gold-400 transition-colors disabled:opacity-40"
        >
          {isPending ? "Submitting..." : isSuccess ? "Created! ✓" : "Create group"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-wide text-sand/50">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
