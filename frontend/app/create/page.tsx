"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseUnits } from "viem";
import { useWaitForTransactionReceipt, useWriteContract, useAccount } from "wagmi";
import { Header } from "@/components/Header";
import { ROSCA_ABI, ROSCA_CONTRACT_ADDRESS, DEFAULT_TOKEN_ADDRESS } from "@/lib/contract";

const CYCLE_PRESETS = [
  { label: "Kowace rana", seconds: 86400 },
  { label: "Kowane mako", seconds: 604800 },
  { label: "Kowane wata (kwana 30)", seconds: 2592000 },
];

export default function CreateGroup() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [token, setToken] = useState(DEFAULT_TOKEN_ADDRESS);
  const [amount, setAmount] = useState("10");
  const [decimals, setDecimals] = useState("6");
  const [maxMembers, setMaxMembers] = useState("5");
  const [cycleSeconds, setCycleSeconds] = useState(CYCLE_PRESETS[1].seconds);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected) return;

    writeContract({
      address: ROSCA_CONTRACT_ADDRESS,
      abi: ROSCA_ABI,
      functionName: "createGroup",
      args: [
        token as `0x${string}`,
        parseUnits(amount || "0", Number(decimals)),
        BigInt(maxMembers),
        BigInt(cycleSeconds),
      ],
    });
  }

  if (isSuccess) {
    setTimeout(() => router.push("/"), 1500);
  }

  return (
    <main className="max-w-lg mx-auto pb-24">
      <Header />

      <section className="px-6 md:px-10 mt-4">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-gold-500">Sabon rukuni</p>
        <h1 className="font-display italic text-3xl text-sand mt-2">Ƙirƙiri Rosca_Credit</h1>
        <p className="text-sand/60 mt-3 text-sm">
          Kai za ka zama admin kuma memba na farko — wanda ke nufin za ka
          karɓi kuɗi a zagaye na farko.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <Field label="Adireshin Token (ERC-20, misali USDC)">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="0x..."
              className="input-field"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Adadin gudummawa">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                min="0"
                step="any"
                className="input-field"
              />
            </Field>
            <Field label="Decimals na token">
              <input
                value={decimals}
                onChange={(e) => setDecimals(e.target.value)}
                type="number"
                min="0"
                max="18"
                className="input-field"
              />
            </Field>
          </div>

          <Field label="Yawan mambobi (= yawan zagaye)">
            <input
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              type="number"
              min="2"
              className="input-field"
            />
          </Field>

          <Field label="Tsawon lokacin kowane zagaye">
            <div className="flex gap-2 flex-wrap">
              {CYCLE_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.seconds}
                  onClick={() => setCycleSeconds(p.seconds)}
                  className={`focus-ring rounded-full px-4 py-2 text-sm border transition-colors ${
                    cycleSeconds === p.seconds
                      ? "bg-gold-500 border-gold-400 text-indigo-950"
                      : "border-sand/15 text-sand/70 hover:border-gold-500/40"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          {!isConnected && (
            <p className="text-teal-700 text-sm">Haɗa wallet ɗinka kafin ka ci gaba.</p>
          )}

          {error && (
            <p className="text-red-400 text-sm break-words">{error.message}</p>
          )}

          <button
            type="submit"
            disabled={!isConnected || isPending || isConfirming}
            className="focus-ring w-full rounded-full bg-gold-500 text-indigo-950 font-medium px-6 py-3 hover:bg-gold-400 transition-colors disabled:opacity-40"
          >
            {isPending || isConfirming ? "Ana aikawa..." : isSuccess ? "An kirkiro! ✓" : "Ƙirƙiri rukuni"}
          </button>
        </form>
      </section>
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
