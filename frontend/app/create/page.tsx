"use client";

import { useState } from "react";
import Link from "next/link";
import { prepareContractCall } from "thirdweb";
import { toUnits } from "@/lib/units";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { roscaContract, useGroupCount } from "@/lib/hooks";
import { DEFAULT_TOKEN_ADDRESS } from "@/lib/contract";

const USDC_DECIMALS = 6;
const PAYOUT_BPS = 3000; // fixed: 30% instant, 70% staked
const REWARD_RATE_BPS = 500; // 5% APY, funded automatically by a 1% per-round fee — no admin funding needed

const CYCLE_PRESETS = [
  { label: "Daily", seconds: 86400 },
  { label: "Weekly", seconds: 604800 },
  { label: "Monthly", seconds: 2592000 },
];

export default function CreateGroup() {
  const account = useActiveAccount();
  const { data: groupCountBefore } = useGroupCount();

  const [groupName, setGroupName] = useState("");
  const [amount, setAmount] = useState("10");
  const [maxMembers, setMaxMembers] = useState("5");
  const [cycleSeconds, setCycleSeconds] = useState(CYCLE_PRESETS[1].seconds);

  const [createdGroupId, setCreatedGroupId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const { mutate: sendTx, isPending, error } = useSendTransaction();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;

    const tx = prepareContractCall({
      contract: roscaContract,
      method: "createGroup",
      params: [
        groupName || "Untitled group",
        DEFAULT_TOKEN_ADDRESS,
        toUnits(amount || "0", USDC_DECIMALS),
        BigInt(maxMembers),
        BigInt(cycleSeconds),
        PAYOUT_BPS,
        REWARD_RATE_BPS,
        0n, // no reward pool deposit needed
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
        <Field label="Group name">
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Family Circle"
            maxLength={60}
            className="input-field"
          />
        </Field>

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

        <div className="rounded-xl border border-teal-700/30 bg-teal-800/10 p-4">
          <p className="text-xs text-teal-700 font-mono uppercase tracking-wide">Built-in staking safety net</p>
          <p className="text-[11px] text-sand/50 leading-relaxed mt-2">
            When a member's turn comes, they get 30% of the pot right away. The other 70% stays
            staked until the group finishes, then can be claimed in full — plus a 5% APY reward,
            self-funded by a small 1% fee taken from each round's pot (no funding needed from you).
            If a member misses a contribution, it's automatically covered from their own stake —
            all of this happens automatically, nothing to configure.
          </p>
        </div>

        {!account && <p className="text-teal-700 text-sm">Sign in with Google to continue.</p>}
        {error && <p className="text-red-400 text-xs break-words">{error.message}</p>}

        <button
          type="submit"
          disabled={!account || isPending}
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
