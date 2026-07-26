"use client";

import { useState } from "react";
import Link from "next/link";
import { prepareContractCall } from "thirdweb";
import { toUnits } from "@/lib/units";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { roscaContract, tokenContract, useGroupCount } from "@/lib/hooks";
import { DEFAULT_TOKEN_ADDRESS } from "@/lib/contract";

const USDC_DECIMALS = 6;

const CYCLE_PRESETS = [
  { label: "Daily", seconds: 86400 },
  { label: "Weekly", seconds: 604800 },
  { label: "Monthly", seconds: 2592000 },
];

export default function CreateGroup() {
  const account = useActiveAccount();
  const { data: groupCountBefore } = useGroupCount();

  const [amount, setAmount] = useState("10");
  const [maxMembers, setMaxMembers] = useState("5");
  const [cycleSeconds, setCycleSeconds] = useState(CYCLE_PRESETS[1].seconds);
  const [payoutPercent, setPayoutPercent] = useState("30");
  const [rewardApy, setRewardApy] = useState("5");
  const [rewardPoolDeposit, setRewardPoolDeposit] = useState("50");

  const [createdGroupId, setCreatedGroupId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: allowance } = useReadContract({
    contract: tokenContract(DEFAULT_TOKEN_ADDRESS),
    method: "allowance",
    params: [account?.address ?? "0x0000000000000000000000000000000000000000", roscaContract.address],
    queryOptions: { enabled: !!account },
  });

  const { mutate: sendTx, isPending, error } = useSendTransaction();

  const rewardPoolUnits = toUnits(rewardPoolDeposit || "0", USDC_DECIMALS);
  const needsApproval = !allowance || (allowance as bigint) < rewardPoolUnits;

  function handleApprove() {
    const tx = prepareContractCall({
      contract: tokenContract(DEFAULT_TOKEN_ADDRESS),
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
        DEFAULT_TOKEN_ADDRESS,
        toUnits(amount || "0", USDC_DECIMALS),
        BigInt(maxMembers),
        BigInt(cycleSeconds),
        Math.round(Number(payoutPercent) * 100), // percent -> bps
        Math.round(Number(rewardApy) * 100), // percent -> bps
        rewardPoolUnits,
      ],
    });

    sendTx(tx as any, {
      onSuccess: () => {
        const newId = groupCountBefore !== undefined ? Number(groupCountBefore) : null;
        setCreatedGroupId(newId);
      },
    });
  }

  const inviteLink =
    createdGroupId !== null && typeof window !== "undefined"
      ? `${window.location.origin}/group/${createdGroupId}`
      : "";

  function handleCopyLink() {
    navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (createdGroupId !== null) {
    return (
      <main className="max-w-lg mx-auto px-5 md:px-8 py-6">
        <div className="rounded-xl border border-gold-500/30 bg-gold-500/5 p-6 text-center">
          <div className="text-3xl mb-3">🎉</div>
          <h1 className="font-display italic text-2xl text-sand">Group created!</h1>
          <p className="text-sand/60 text-sm mt-2">
            Share this link with the people you want in your group. Once it's full, the link stops
            letting new people join — the group starts automatically.
          </p>
          <div className="rounded-lg bg-indigo-950/40 border border-sand/10 p-3 font-mono text-xs text-sand break-all mt-4">
            {inviteLink}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCopyLink}
              className="focus-ring flex-1 rounded-full bg-gold-500 text-indigo-950 font-medium py-2.5 text-sm hover:bg-gold-400"
            >
              {copied ? "Copied ✓" : "Copy invite link"}
            </button>
            <Link
              href={`/group/${createdGroupId}`}
              className="focus-ring flex-1 text-center rounded-full border border-sand/20 text-sand py-2.5 text-sm hover:border-gold-500/40"
            >
              View group
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-5 md:px-8 py-6">
      <p className="font-mono text-xs tracking-[0.2em] uppercase text-gold-500">New group</p>
      <h1 className="font-display italic text-3xl text-sand mt-2">Create a Rosca_Credit group</h1>
      <p className="text-sand/60 mt-3 text-sm">
        You'll become the admin and the first member — you'll receive the payout in the first round.
        You'll get a shareable link to invite people once it's created.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Field label="How many people can join?">
          <input value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} type="number" min="2" className="input-field" />
        </Field>

        <Field label="Contribution amount per round (USDC)">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="any" className="input-field" />
        </Field>

        <Field label="How often does a round happen?">
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
          <Field label="Reward pool you'll fund upfront (USDC)">
            <input value={rewardPoolDeposit} onChange={(e) => setRewardPoolDeposit(e.target.value)} type="number" min="0" step="any" className="input-field" />
          </Field>
          <p className="text-[11px] text-sand/50 leading-relaxed">
            When a member's turn comes, they get {payoutPercent || 0}% right away; the other{" "}
            {100 - Number(payoutPercent || 0)}% stays staked, earning {rewardApy || 0}% APY, until the
            group finishes. Missed contributions are auto-deducted from a member's stake.
          </p>
        </div>

        {!account && <p className="text-teal-700 text-sm">Sign in with Google to continue.</p>}
        {error && <p className="text-red-400 text-xs break-words">{error.message}</p>}

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
          {isPending ? "Creating..." : "Create group"}
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
