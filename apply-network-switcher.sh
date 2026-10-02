#!/data/data/com.termux/files/usr/bin/bash
# RoscaCredit: Add in-app Mainnet/Testnet network switcher
set -e

echo "Writing frontend/lib/chain.ts ..."
cat > frontend/lib/chain.ts << 'FILEEOF'
import { defineChain } from "thirdweb/chains";

export const arcMainnet = defineChain({
  id: 5042,
  name: "Arc",
  rpc: "https://rpc.mainnet.arc.io",
  nativeCurrency: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 18,
  },
  blockExplorers: [
    { name: "Arc Explorer", url: "https://explorer.arc.io" },
  ],
  testnet: false,
});

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  rpc: "https://5042002.rpc.thirdweb.com",
  nativeCurrency: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 18,
  },
  blockExplorers: [
    { name: "Arcscan", url: "https://testnet.arcscan.app" },
  ],
  testnet: true,
});
FILEEOF

echo "Writing frontend/contexts/NetworkContext.tsx ..."
cat > frontend/contexts/NetworkContext.tsx << 'FILEEOF'
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { arcMainnet, arcTestnet } from "@/lib/chain";

export type RoscaNetwork = "mainnet" | "testnet";

type NetworkContextValue = {
  network: RoscaNetwork;
  setNetwork: (n: RoscaNetwork) => void;
  chain: typeof arcMainnet;
  roscaAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  explorerUrl: string;
};

const NetworkContext = createContext<NetworkContextValue | null>(null);

const STORAGE_KEY = "rosca-network";

const MAINNET_ROSCA = (process.env.NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
const TESTNET_ROSCA = (process.env.NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS_TESTNET ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
const MAINNET_TOKEN = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
const TESTNET_TOKEN = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS_TESTNET ||
  "0x3600000000000000000000000000000000000000") as `0x${string}`;

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetworkState] = useState<RoscaNetwork>("mainnet");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "mainnet" || saved === "testnet") setNetworkState(saved);
    } catch {
      // ignore — defaults to mainnet
    }
  }, []);

  function setNetwork(n: RoscaNetwork) {
    setNetworkState(n);
    try {
      window.localStorage.setItem(STORAGE_KEY, n);
    } catch {
      // ignore
    }
  }

  const value = useMemo<NetworkContextValue>(() => {
    if (network === "testnet") {
      return {
        network,
        setNetwork,
        chain: arcTestnet,
        roscaAddress: TESTNET_ROSCA,
        tokenAddress: TESTNET_TOKEN,
        explorerUrl: "https://testnet.arcscan.app",
      };
    }
    return {
      network,
      setNetwork,
      chain: arcMainnet,
      roscaAddress: MAINNET_ROSCA,
      tokenAddress: MAINNET_TOKEN,
      explorerUrl: "https://explorer.arc.io",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network]);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used within NetworkProvider");
  return ctx;
}
FILEEOF

echo "Writing frontend/components/NetworkSwitcher.tsx ..."
cat > frontend/components/NetworkSwitcher.tsx << 'FILEEOF'
"use client";

import { useState } from "react";
import { useNetwork } from "@/contexts/NetworkContext";

export function NetworkSwitcher() {
  const { network, setNetwork } = useNetwork();
  const [confirming, setConfirming] = useState(false);

  function handleToggle() {
    if (network === "testnet") {
      setConfirming(true);
    } else {
      setNetwork("testnet");
    }
  }

  function confirmMainnet() {
    setNetwork("mainnet");
    setConfirming(false);
  }

  return (
    <div className="rounded-lg border border-sand/10 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${network === "mainnet" ? "bg-gold-500" : "bg-orange-400"}`} />
          <span className="text-[11px] font-mono text-sand/60 truncate">
            {network === "mainnet" ? "Arc Mainnet" : "Arc Testnet (test funds)"}
          </span>
        </div>
        <button
          onClick={handleToggle}
          className="focus-ring shrink-0 text-[10px] font-mono uppercase tracking-wide text-gold-500 hover:text-gold-400"
        >
          Switch
        </button>
      </div>

      {confirming && (
        <div className="mt-2 rounded-md border border-gold-500/30 bg-gold-500/5 p-2">
          <p className="text-[11px] text-sand/70 leading-relaxed">
            Switching to Mainnet uses real USDC. Continue?
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={confirmMainnet}
              className="focus-ring flex-1 rounded-full bg-gold-500 text-indigo-950 text-[11px] font-medium py-1.5"
            >
              Yes, use Mainnet
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="focus-ring flex-1 rounded-full border border-sand/15 text-sand/60 text-[11px] py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
FILEEOF

echo "Writing frontend/lib/hooks.ts ..."
cat > frontend/lib/hooks.ts << 'FILEEOF'
"use client";

import { getContract } from "thirdweb";
import { useReadContract } from "thirdweb/react";
import { useMemo } from "react";
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
  return useReadContract({
    contract,
    method: "getStakeInfo",
    params: [BigInt(groupId), (member ?? "0x0000000000000000000000000000000000000000") as `0x${string}`],
    queryOptions: { enabled: !!member, ...POLL },
  });
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
FILEEOF

echo "Writing frontend/lib/contract.ts ..."
cat > frontend/lib/contract.ts << 'FILEEOF'
export const ROSCA_CONTRACT_ADDRESS_MAINNET = (process.env.NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const ROSCA_CONTRACT_ADDRESS_TESTNET = (process.env.NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS_TESTNET ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const DEFAULT_TOKEN_ADDRESS_MAINNET = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const DEFAULT_TOKEN_ADDRESS_TESTNET = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS_TESTNET ||
  "0x3600000000000000000000000000000000000000") as `0x${string}`;

export const ROSCA_ABI = [
  {
    type: "function",
    name: "createGroup",
    stateMutability: "nonpayable",
    inputs: [
      { name: "groupName", type: "string" },
      { name: "token", type: "address" },
      { name: "contributionAmount", type: "uint256" },
      { name: "maxMembers", type: "uint256" },
      { name: "cycleDuration", type: "uint256" },
      { name: "payoutBps", type: "uint16" },
      { name: "rewardRateBps", type: "uint16" },
      { name: "rewardPoolDeposit", type: "uint256" },
    ],
    outputs: [{ name: "groupId", type: "uint256" }],
  },
  {
    type: "function",
    name: "joinGroup",
    stateMutability: "nonpayable",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "contribute",
    stateMutability: "nonpayable",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "settleRound",
    stateMutability: "nonpayable",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimStake",
    stateMutability: "nonpayable",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "groupCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getGroup",
    stateMutability: "view",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [
      { name: "admin", type: "address" },
      { name: "token", type: "address" },
      { name: "contributionAmount", type: "uint256" },
      { name: "maxMembers", type: "uint256" },
      { name: "cycleDuration", type: "uint256" },
      { name: "roundStartTime", type: "uint256" },
      { name: "currentRound", type: "uint256" },
      { name: "active", type: "bool" },
      { name: "finished", type: "bool" },
      { name: "potThisRound", type: "uint256" },
      { name: "memberCount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getGroupName",
    stateMutability: "view",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "getGroupStaking",
    stateMutability: "view",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [
      { name: "payoutBps", type: "uint16" },
      { name: "rewardRateBps", type: "uint16" },
      { name: "rewardPool", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getMembers",
    stateMutability: "view",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getRoundStatus",
    stateMutability: "view",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "round", type: "uint256" },
    ],
    outputs: [{ name: "contributed", type: "bool[]" }],
  },
  {
    type: "function",
    name: "getStakeInfo",
    stateMutability: "view",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "member", type: "address" },
    ],
    outputs: [
      { name: "principal", type: "uint256" },
      { name: "pendingReward", type: "uint256" },
      { name: "shortfall", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "payShortfall",
    stateMutability: "nonpayable",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isMember",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "GroupCreated",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "admin", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "contributionAmount", type: "uint256", indexed: false },
      { name: "maxMembers", type: "uint256", indexed: false },
      { name: "cycleDuration", type: "uint256", indexed: false },
      { name: "payoutBps", type: "uint16", indexed: false },
      { name: "rewardRateBps", type: "uint16", indexed: false },
      { name: "rewardPoolDeposit", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoundSettled",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "round", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "immediatePayout", type: "uint256", indexed: false },
      { name: "stakedPortion", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "StakeClaimed",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
      { name: "principal", type: "uint256", indexed: false },
      { name: "reward", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;
FILEEOF

echo "Writing frontend/app/providers.tsx ..."
cat > frontend/app/providers.tsx << 'FILEEOF'
"use client";

import { ThirdwebProvider } from "thirdweb/react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NetworkProvider } from "@/contexts/NetworkContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThirdwebProvider>
      <NetworkProvider>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </NetworkProvider>
    </ThirdwebProvider>
  );
}
FILEEOF

echo "Writing frontend/components/ConnectWallet.tsx ..."
cat > frontend/components/ConnectWallet.tsx << 'FILEEOF'
"use client";

import { ConnectButton, darkTheme } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdwebClient";
import { useNetwork } from "@/contexts/NetworkContext";

const wallets = [
  inAppWallet({
    auth: {
      options: ["google", "email"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("walletConnect"),
];

const roscaTheme = darkTheme({
  colors: {
    modalBg: "#1B1F3B",
    accentButtonBg: "#E8A33D",
    accentButtonText: "#151832",
    primaryButtonBg: "#E8A33D",
    primaryButtonText: "#151832",
    borderColor: "rgba(245,239,224,0.15)",
    separatorLine: "rgba(245,239,224,0.1)",
  },
});

export function ConnectWallet() {
  const { chain } = useNetwork();

  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      chain={chain}
      theme={roscaTheme}
      connectModal={{ size: "compact", title: "Sign in to Rosca_Credit" }}
      connectButton={{ label: "Continue with Google" }}
      detailsButton={{}}
    />
  );
}
FILEEOF

echo "Writing frontend/components/Sidebar.tsx ..."
cat > frontend/components/Sidebar.tsx << 'FILEEOF'
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoLockup } from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActiveAccount, useDisconnect, useActiveWallet } from "thirdweb/react";
import { NetworkSwitcher } from "@/components/NetworkSwitcher";

const NAV_ITEMS = [
  { key: "home", href: "/", icon: "🏠" },
  { key: "groups", href: "/groups", icon: "👥" },
  { key: "createGroup", href: "/create", icon: "➕" },
  { key: "wallet", href: "/wallet", icon: "💳" },
  { key: "activity", href: "/activity", icon: "📊" },
  { key: "inviteFriends", href: "/invite", icon: "🎁" },
  { key: "notifications", href: "/notifications", icon: "🔔" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-sand/10 min-h-screen px-4 py-6">
      <div className="px-2 mb-8">
        <LogoLockup />
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-gold-500/10 text-gold-400 border border-gold-500/30"
                  : "text-sand/70 hover:bg-indigo-800/50 border border-transparent"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              <span>{t(item.key as any)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 pt-4 border-t border-sand/10">
        <Link
          href="/settings"
          className={`focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
            pathname === "/settings" ? "bg-gold-500/10 text-gold-400 border border-gold-500/30" : "text-sand/70 hover:bg-indigo-800/50 border border-transparent"
          }`}
        >
          <span aria-hidden>⚙️</span>
          <span>{t("settings")}</span>
        </Link>

        {account && (
          <button
            onClick={() => wallet && disconnect(wallet)}
            className="focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sand/50 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <span aria-hidden>↩︎</span>
            <span>{t("logout")}</span>
          </button>
        )}

        <NetworkSwitcher />

        {account && (
          <div className="rounded-lg border border-sand/10 px-3 py-2">
            <div className="font-mono text-[11px] text-sand/40">
              {account.address.slice(0, 6)}…{account.address.slice(-4)}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
FILEEOF

echo "Writing frontend/app/wallet/page.tsx ..."
cat > frontend/app/wallet/page.tsx << 'FILEEOF'
"use client";

import { useState } from "react";
import Link from "next/link";
import { prepareTransaction } from "thirdweb";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { formatUnits, toUnits } from "@/lib/units";
import { useTokenBalance, useTokenSymbol } from "@/lib/hooks";
import { useLanguage } from "@/contexts/LanguageContext";
import { client } from "@/lib/thirdwebClient";
import { useNetwork } from "@/contexts/NetworkContext";

type Panel = "none" | "deposit" | "withdraw";

export default function WalletPage() {
  const account = useActiveAccount();
  const { t } = useLanguage();
  const { chain, tokenAddress } = useNetwork();
  const { data: balance, refetch: refetchBalance } = useTokenBalance(tokenAddress, account?.address);
  const { data: symbol } = useTokenSymbol(tokenAddress);

  const [panel, setPanel] = useState<Panel>("none");
  const [copied, setCopied] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const { mutate: sendTx, isPending, isSuccess, error } = useSendTransaction();

  function handleCopy() {
    if (!account) return;
    navigator.clipboard?.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !recipient || !amount) return;

    const tx = prepareTransaction({
      to: recipient as `0x${string}`,
      chain,
      client,
      value: toUnits(amount, 18),
    });

    sendTx(tx, {
      onSuccess: () => {
        setRecipient("");
        setAmount("");
        refetchBalance();
        setTimeout(() => setPanel("none"), 1500);
      },
    });
  }

  return (
    <main className="max-w-lg mx-auto px-5 md:px-8 py-6">
      <h1 className="font-display font-bold text-2xl text-sand mb-6">{t("wallet")}</h1>

      {!account ? (
        <div className="rounded-xl border border-dashed border-sand/15 p-10 text-center text-sand/50">
          Sign in with Google to view your wallet.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-sand/10 bg-indigo-800/40 p-6 text-center">
            <div className="font-mono text-xs uppercase tracking-wide text-sand/50">Total Balance</div>
            <div className="font-display text-3xl text-sand mt-2">
              {balance !== undefined ? formatUnits(balance, 6) : "—"} {symbol ?? "USDC"}
            </div>
            <div className="font-mono text-[11px] text-sand/40 mt-1">
              {account.address.slice(0, 8)}…{account.address.slice(-6)}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setPanel(panel === "deposit" ? "none" : "deposit")}
                className="focus-ring rounded-full bg-teal-800 text-sand font-medium py-3 hover:bg-teal-700 transition-colors"
              >
                Deposit
              </button>
              <button
                onClick={() => setPanel(panel === "withdraw" ? "none" : "withdraw")}
                className="focus-ring rounded-full border border-sand/20 text-sand font-medium py-3 hover:border-gold-500/40 transition-colors"
              >
                Withdraw
              </button>
            </div>
          </div>

          {panel === "deposit" && (
            <div className="mt-4 rounded-xl border border-teal-700/40 bg-teal-800/10 p-5">
              <div className="font-mono text-xs uppercase tracking-wide text-teal-700 mb-3">
                Receive USDC
              </div>
              <p className="text-sand/60 text-sm mb-3">
                Send USDC on Arc to this address to fund your wallet.
              </p>
              <div className="rounded-lg bg-indigo-950/60 border border-sand/10 p-3 font-mono text-xs text-sand break-all">
                {account.address}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCopy}
                  className="focus-ring w-full rounded-full bg-gold-500 text-indigo-950 font-medium py-2.5 text-sm hover:bg-gold-400"
                >
                  {copied ? "Copied ✓" : "Copy address"}
                </button>
              </div>
            </div>
          )}

          {panel === "withdraw" && (
            <form onSubmit={handleWithdraw} className="mt-4 rounded-xl border border-sand/10 bg-indigo-800/40 p-5 space-y-4">
              <div className="font-mono text-xs uppercase tracking-wide text-sand/50">
                Send USDC to another address
              </div>
              <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-wide text-sand/50">Recipient address</span>
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  className="input-field mt-2"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-wide text-sand/50">Amount (USDC)</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  className="input-field mt-2"
                />
              </label>
              {error && <p className="text-red-400 text-xs break-words">{error.message}</p>}
              <button
                type="submit"
                disabled={isPending || !recipient || !amount}
                className="focus-ring w-full rounded-full bg-gold-500 text-indigo-950 font-medium py-3 hover:bg-gold-400 disabled:opacity-40"
              >
                {isPending ? "Sending..." : isSuccess ? "Sent ✓" : "Send"}
              </button>
            </form>
          )}

          <div className="mt-8">
            <div className="font-mono text-xs uppercase tracking-wide text-sand/40 mb-3">{t("transactionHistory")}</div>
            <Link
              href="/activity"
              className="focus-ring block rounded-xl border border-dashed border-sand/15 p-6 text-center text-sand/50 text-sm hover:border-gold-500/40"
            >
              View your full activity — contributions, payouts, and stake claims →
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
FILEEOF

echo "Writing frontend/app/create/page.tsx ..."
cat > frontend/app/create/page.tsx << 'FILEEOF'
"use client";

import { useState } from "react";
import Link from "next/link";
import { prepareContractCall } from "thirdweb";
import { toUnits } from "@/lib/units";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { useGroupCount, useRoscaContract } from "@/lib/hooks";
import { useNetwork } from "@/contexts/NetworkContext";

const USDC_DECIMALS = 6;
const PAYOUT_BPS = 3000;
const REWARD_RATE_BPS = 500;

const CYCLE_PRESETS = [
  { label: "Daily", seconds: 86400 },
  { label: "Weekly", seconds: 604800 },
  { label: "Monthly", seconds: 2592000 },
];

export default function CreateGroup() {
  const account = useActiveAccount();
  const roscaContract = useRoscaContract();
  const { tokenAddress } = useNetwork();
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
        tokenAddress,
        toUnits(amount || "0", USDC_DECIMALS),
        BigInt(maxMembers),
        BigInt(cycleSeconds),
        PAYOUT_BPS,
        REWARD_RATE_BPS,
        0n,
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
          <h1 className="font-display font-bold text-2xl text-sand">Group created!</h1>
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
      <h1 className="font-display font-bold text-3xl text-sand mt-2">Create a Rosca_Credit group</h1>
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
FILEEOF

echo "Writing frontend/app/group/[id]/page.tsx ..."
cat > "frontend/app/group/[id]/page.tsx" << 'FILEEOF'
"use client";

import { useMemo, useState } from "react";
import { formatUnits } from "@/lib/units";
import { prepareContractCall } from "thirdweb";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { RotationWheel } from "@/components/RotationWheel";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useRoscaContract, useTokenContract, useGroup, useGroupStaking, useGroupName, useMembers, useRoundStatus, useStakeInfo, useTokenDecimals, useTokenSymbol } from "@/lib/hooks";

export default function GroupDetail({ params }: { params: { id: string } }) {
  const groupId = Number(params.id);
  const account = useActiveAccount();
  const roscaContract = useRoscaContract();
  const [linkCopied, setLinkCopied] = useState(false);
  const { data: groupName } = useGroupName(groupId);

  function handleShareLink() {
    const link = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard?.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  const { data: groupData, refetch: refetchGroup } = useGroup(groupId);
  const { data: stakingData, refetch: refetchStaking } = useGroupStaking(groupId);
  const { data: members, refetch: refetchMembers } = useMembers(groupId);

  const [
    admin, token, contributionAmount, maxMembers, cycleDuration, roundStartTime,
    currentRound, active, finished, potThisRound, memberCount,
  ] = (groupData as any) || [];

  const [payoutBps, rewardRateBps] = (stakingData as any) || [3000, 500, 0n];

  const { data: roundStatus, refetch: refetchRound } = useRoundStatus(groupId, currentRound !== undefined ? Number(currentRound) : 0);
  const { data: stakeInfo, refetch: refetchStake } = useStakeInfo(groupId, account?.address);

  const decimals = useTokenDecimals(token as `0x${string}`);
  const symbol = useTokenSymbol(token as `0x${string}`);
  const dec = decimals.data ?? 6;
  const tokenContractInstance = useTokenContract((token ?? "0x0000000000000000000000000000000000000000") as `0x${string}`);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    contract: tokenContractInstance,
    method: "allowance",
    params: [account?.address ?? "0x0000000000000000000000000000000000000000", roscaContract.address],
    queryOptions: { enabled: !!account && !!token },
  });

  const { mutate: sendTx, isPending } = useSendTransaction();

  function refetchAll() {
    refetchGroup(); refetchStaking(); refetchMembers(); refetchRound(); refetchAllowance(); refetchStake();
  }

  const isMemberHere = useMemo(
    () => !!members && !!account && (members as string[]).some((m) => m.toLowerCase() === account.address.toLowerCase()),
    [members, account]
  );

  const needsApproval = allowance !== undefined && contributionAmount !== undefined && (allowance as bigint) < contributionAmount;

  const myIndex = useMemo(() => {
    if (!members || !account) return -1;
    return (members as string[]).findIndex((m) => m.toLowerCase() === account.address.toLowerCase());
  }, [members, account]);

  const iHaveContributed = myIndex >= 0 && roundStatus ? (roundStatus as boolean[])[myIndex] : false;

  const wheelMembers = useMemo(() => {
    if (!members) return [];
    return (members as string[]).map((m, i) => ({ address: m, contributed: roundStatus ? (roundStatus as boolean[])[i] : false }));
  }, [members, roundStatus]);

  const deadline = roundStartTime && cycleDuration ? Number(roundStartTime) + Number(cycleDuration) : 0;
  const deadlinePassed = deadline > 0 && Date.now() / 1000 >= deadline;
  const everyoneContributed = roundStatus ? (roundStatus as boolean[]).every(Boolean) : false;

  const [stakedPrincipal, pendingReward, shortfall] = (stakeInfo as any) ?? [0n, 0n, 0n];
  const needsShortfallApproval = allowance !== undefined && (allowance as bigint) < shortfall;

  if (!groupData) {
    return <main className="max-w-2xl mx-auto px-5 md:px-8 py-10 text-sand/50">Loading...</main>;
  }

  return (
    <main className="max-w-2xl mx-auto px-5 md:px-8 py-6">
      <p className="font-mono text-xs tracking-[0.2em] uppercase text-gold-500">
        {groupName && groupName !== "" ? groupName : `Group #${groupId}`}
      </p>
      <h1 className="font-display font-bold text-3xl text-sand mt-2">
        {formatUnits(contributionAmount, dec)} {symbol.data ?? "USDC"} / round
      </h1>
      <p className="text-sand/50 font-mono text-sm mt-2">
        Admin: {shortAddr(admin)} · {memberCount?.toString()}/{maxMembers?.toString()} members ·{" "}
        {Number(payoutBps) / 100}% instant / {100 - Number(payoutBps) / 100}% staked
      </p>

      {!active && (
        <button
          onClick={handleShareLink}
          className="focus-ring mt-4 w-full sm:w-auto rounded-full border border-gold-500/40 text-gold-400 text-sm font-medium px-5 py-2.5 hover:bg-gold-500/10"
        >
          {linkCopied ? "Link copied ✓" : "🔗 Copy invite link to share"}
        </button>
      )}

      <section className="mt-8 flex justify-center">
        <RotationWheel members={wheelMembers} currentRound={Number(currentRound ?? 0)} finished={!!finished} />
      </section>

      <section className="mt-8 space-y-3">
        {!active && (
          <StatusBanner tone="teal">
            Waiting for members to join. {maxMembers?.toString()} needed, {memberCount?.toString()} joined so far.
          </StatusBanner>
        )}
        {active && !finished && (
          <StatusBanner tone="gold">
            Pot collected this round: {formatUnits(potThisRound ?? 0n, dec)} {symbol.data ?? "USDC"}
            {deadlinePassed ? " · Round deadline passed, settlement can be triggered." : ""}
          </StatusBanner>
        )}
        {active && !finished && deadline > 0 && !deadlinePassed && (
          <div className="rounded-lg border border-sand/10 bg-indigo-800/40 px-4 py-3">
            <CountdownTimer deadlineUnix={deadline} label="Time left to contribute this round:" />
          </div>
        )}
        {finished && <StatusBanner tone="teal">This group has completed all its rounds. Thank you!</StatusBanner>}

        {isMemberHere && (stakedPrincipal > 0n || pendingReward > 0n) && (
          <div className="rounded-lg border border-gold-500/20 bg-gold-500/5 p-4">
            <div className="font-mono text-xs uppercase text-gold-400">Your stake in this group</div>
            <div className="font-display text-xl text-sand mt-1">
              {formatUnits(stakedPrincipal, dec)} {symbol.data ?? "USDC"}
            </div>
            <div className="font-mono text-xs text-sand/50 mt-1">
              + {formatUnits(pendingReward, dec)} {symbol.data ?? "USDC"} reward accrued
            </div>
          </div>
        )}

        {isMemberHere && shortfall > 0n && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/5 p-4">
            <div className="font-mono text-xs uppercase text-red-300">Outstanding shortfall</div>
            <div className="font-display text-lg text-sand mt-1">
              {formatUnits(shortfall, dec)} {symbol.data ?? "USDC"} owed
            </div>
            <p className="text-xs text-sand/50 mt-1">
              A missed contribution wasn't fully covered by your stake. Pay this off to be able to
              claim your stake once the group finishes.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4">
          {!active && !isMemberHere && (
            <ActionButton
              disabled={!account || isPending}
              onClick={() => sendTx(prepareContractCall({ contract: roscaContract, method: "joinGroup", params: [BigInt(groupId)] }) as any, { onSuccess: refetchAll })}
            >
              Join this group
            </ActionButton>
          )}

          {active && !finished && isMemberHere && !iHaveContributed && needsApproval && (
            <ActionButton
              disabled={isPending}
              onClick={() => sendTx(prepareContractCall({ contract: tokenContractInstance, method: "approve", params: [roscaContract.address, contributionAmount] }) as any, { onSuccess: refetchAll })}
            >
              Approve token spending
            </ActionButton>
          )}

          {active && !finished && isMemberHere && !iHaveContributed && !needsApproval && (
            <ActionButton
              disabled={isPending}
              onClick={() => sendTx(prepareContractCall({ contract: roscaContract, method: "contribute", params: [BigInt(groupId)] }) as any, { onSuccess: refetchAll })}
            >
              Make contribution
            </ActionButton>
          )}

          {active && !finished && isMemberHere && iHaveContributed && (
            <StatusBanner tone="teal">✓ You've contributed this round — waiting for the round to settle.</StatusBanner>
          )}

          {active && !finished && (everyoneContributed || deadlinePassed) && (
            <ActionButton
              variant="secondary"
              disabled={isPending}
              onClick={() => sendTx(prepareContractCall({ contract: roscaContract, method: "settleRound", params: [BigInt(groupId)] }) as any, { onSuccess: refetchAll })}
            >
              Settle round & send payout
            </ActionButton>
          )}

          {isMemberHere && shortfall > 0n && needsShortfallApproval && (
            <ActionButton
              disabled={isPending}
              onClick={() => sendTx(prepareContractCall({ contract: tokenContractInstance, method: "approve", params: [roscaContract.address, shortfall] }) as any, { onSuccess: refetchAll })}
            >
              Approve shortfall payment
            </ActionButton>
          )}

          {isMemberHere && shortfall > 0n && !needsShortfallApproval && (
            <ActionButton
              disabled={isPending}
              onClick={() => sendTx(prepareContractCall({ contract: roscaContract, method: "payShortfall", params: [BigInt(groupId)] }) as any, { onSuccess: refetchAll })}
            >
              Pay off shortfall
            </ActionButton>
          )}

          {finished && isMemberHere && shortfall === 0n && (stakedPrincipal > 0n || pendingReward > 0n) && (
            <ActionButton
              disabled={isPending}
              onClick={() => sendTx(prepareContractCall({ contract: roscaContract, method: "claimStake", params: [BigInt(groupId)] }) as any, { onSuccess: refetchAll })}
            >
              Claim stake + reward
            </ActionButton>
          )}
        </div>
      </section>
    </main>
  );
}

function ActionButton({ children, onClick, disabled, variant = "primary" }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; variant?: "primary" | "secondary" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`focus-ring w-full rounded-full font-medium px-6 py-3 transition-colors disabled:opacity-40 ${
        variant === "primary" ? "bg-gold-500 text-indigo-950 hover:bg-gold-400" : "bg-transparent border border-teal-700 text-sand hover:bg-teal-800/40"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBanner({ children, tone }: { children: React.ReactNode; tone: "gold" | "teal" }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-mono ${tone === "gold" ? "border-gold-500/30 text-gold-400 bg-gold-500/5" : "border-teal-700/40 text-teal-700 bg-teal-800/10"}`}>
      {children}
    </div>
  );
}

function shortAddr(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
FILEEOF

echo "Writing frontend/app/activity/page.tsx ..."
cat > frontend/app/activity/page.tsx << 'FILEEOF'
"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveAccount, useContractEvents } from "thirdweb/react";
import { formatUnits } from "@/lib/units";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRoscaContract } from "@/lib/hooks";
import { useNetwork } from "@/contexts/NetworkContext";
import { contributedEvent, missedContributionEvent, roundSettledEvent, stakeClaimedEvent } from "@/lib/events";

type FeedItem = {
  key: string;
  blockNumber: bigint;
  icon: string;
  title: string;
  detail: string;
  tone: "gold" | "teal" | "red";
};

function shortAddr(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ActivityPage() {
  const account = useActiveAccount();
  const { t } = useLanguage();
  const roscaContract = useRoscaContract();
  const { explorerUrl } = useNetwork();

  const { data: contributed } = useContractEvents({ contract: roscaContract, events: [contributedEvent] });
  const { data: missed } = useContractEvents({ contract: roscaContract, events: [missedContributionEvent] });
  const { data: settled } = useContractEvents({ contract: roscaContract, events: [roundSettledEvent] });
  const { data: claimed } = useContractEvents({ contract: roscaContract, events: [stakeClaimedEvent] });

  const [transfers, setTransfers] = useState<FeedItem[]>([]);

  useEffect(() => {
    if (!account) {
      setTransfers([]);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `${explorerUrl}/api/v2/addresses/${account.address}/transactions`
        );
        if (!res.ok) return;
        const json = await res.json();
        const items: FeedItem[] = (json?.items ?? [])
          .map((tx: any): FeedItem | null => {
            try {
              const isSent = tx.from?.hash?.toLowerCase() === account.address.toLowerCase();
              const valueWei = BigInt(tx.value ?? "0");
              if (valueWei === 0n) return null;
              return {
                key: `tx-${tx.hash}`,
                blockNumber: BigInt(tx.block_number ?? 0),
                icon: isSent ? "↗️" : "↘️",
                title: isSent
                  ? `Sent USDC to ${shortAddr(tx.to?.hash)}`
                  : `Received USDC from ${shortAddr(tx.from?.hash)}`,
                detail: `${formatUnits(valueWei, 18)} USDC`,
                tone: isSent ? "red" : "teal",
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean) as FeedItem[];
        if (!cancelled) setTransfers(items);
      } catch {
        // silently ignore — the explorer link below still covers this
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [account, explorerUrl]);

  const feed = useMemo<FeedItem[]>(() => {
    if (!account) return [];
    const me = account.address.toLowerCase();
    const items: FeedItem[] = [...transfers];

    (contributed ?? []).forEach((e: any) => {
      if (e.args?.member?.toLowerCase() !== me) return;
      items.push({
        key: `contrib-${e.transactionHash}`,
        blockNumber: e.blockNumber,
        icon: "💸",
        title: `You contributed to Group #${e.args.groupId}`,
        detail: `${formatUnits(e.args.amount, 6)} USDC · Round ${Number(e.args.round) + 1}`,
        tone: "gold",
      });
    });

    (settled ?? []).forEach((e: any) => {
      if (e.args?.recipient?.toLowerCase() !== me) return;
      items.push({
        key: `settled-${e.transactionHash}`,
        blockNumber: e.blockNumber,
        icon: "🎉",
        title: `You received a payout from Group #${e.args.groupId}`,
        detail: `${formatUnits(e.args.immediatePayout, 6)} USDC instant + ${formatUnits(e.args.stakedPortion, 6)} USDC staked · Round ${Number(e.args.round) + 1}`,
        tone: "gold",
      });
    });

    (claimed ?? []).forEach((e: any) => {
      if (e.args?.member?.toLowerCase() !== me) return;
      items.push({
        key: `claim-${e.transactionHash}`,
        blockNumber: e.blockNumber,
        icon: "🏆",
        title: `You claimed your stake from Group #${e.args.groupId}`,
        detail: `${formatUnits(e.args.principal, 6)} USDC principal + ${formatUnits(e.args.reward, 6)} USDC reward`,
        tone: "teal",
      });
    });

    (missed ?? []).forEach((e: any) => {
      if (e.args?.member?.toLowerCase() !== me) return;
      items.push({
        key: `missed-${e.transactionHash}`,
        blockNumber: e.blockNumber,
        icon: "⚠️",
        title: `Missed contribution auto-covered from your stake — Group #${e.args.groupId}`,
        detail: `${formatUnits(e.args.deductedFromStake, 6)} USDC deducted · Round ${Number(e.args.round) + 1}`,
        tone: "red",
      });
    });

    return items.sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : -1));
  }, [account, transfers, contributed, missed, settled, claimed]);

  return (
    <main className="max-w-lg mx-auto px-5 md:px-8 py-6">
      <h1 className="font-display font-bold text-2xl text-sand mb-6">{t("activity")}</h1>

      {!account ? (
        <div className="rounded-xl border border-dashed border-sand/15 p-10 text-center text-sand/50">
          Sign in with Google to see your activity.
        </div>
      ) : feed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sand/15 p-10 text-center text-sand/50 text-sm">
          No activity yet — sends, receives, contributions, payouts, and stake claims will show up here.
        </div>
      ) : (
        <div className="space-y-3">
          {feed.map((item) => (
            <div
              key={item.key}
              className={`rounded-xl border p-4 flex items-start gap-3 ${
                item.tone === "gold"
                  ? "border-gold-500/20 bg-gold-500/5"
                  : item.tone === "red"
                  ? "border-red-400/20 bg-red-500/5"
                  : "border-teal-700/30 bg-teal-800/10"
              }`}
            >
              <span className="text-xl" aria-hidden>{item.icon}</span>
              <div className="min-w-0">
                <div className="text-sand text-sm">{item.title}</div>
                <div className="font-mono text-xs text-sand/50 mt-1">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {account && (
        <a
          href={`${explorerUrl}/address/${account.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring block text-center mt-6 text-xs text-gold-500 underline font-mono"
        >
          View full wallet history on Arc Explorer →
        </a>
      )}
    </main>
  );
}
FILEEOF

echo "Writing frontend/app/page.tsx ..."
cat > frontend/app/page.tsx << 'FILEEOF'
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatUnits } from "@/lib/units";
import { prepareContractCall } from "thirdweb";
import { useActiveAccount, useProfiles, useSendTransaction } from "thirdweb/react";
import { StatCard } from "@/components/StatCard";
import { GroupCard } from "@/components/GroupCard";
import { GroupStatsCollector, GroupStat } from "@/components/GroupStatsCollector";
import { LandingPage } from "@/components/LandingPage";
import { useGroupCount, useTokenBalance, useRoscaContract } from "@/lib/hooks";
import { useNetwork } from "@/contexts/NetworkContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { client } from "@/lib/thirdwebClient";
import { getGreeting } from "@/lib/greeting";

export default function Home() {
  const account = useActiveAccount();
  const { t } = useLanguage();
  const roscaContract = useRoscaContract();
  const { tokenAddress } = useNetwork();
  const { data: groupCount } = useGroupCount();
  const { data: walletBalance } = useTokenBalance(tokenAddress, account?.address);
  const { data: profiles } = useProfiles({ client });

  const { mutate: sendTx, isPending: isClaiming } = useSendTransaction();
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const googleProfile = profiles?.find((p: any) => p.type === "google") as any;
  const displayName =
    googleProfile?.details?.name ||
    googleProfile?.details?.email?.split("@")[0] ||
    (account ? `${account.address.slice(0, 6)}…${account.address.slice(-4)}` : "");

  const greeting = getGreeting(displayName || undefined);

  const count = groupCount ? Number(groupCount) : 0;
  const allIds = Array.from({ length: count }, (_, i) => count - 1 - i);

  const [stats, setStats] = useState<Record<number, GroupStat>>({});
  const handleData = useCallback((stat: GroupStat) => {
    setStats((prev) => ({ ...prev, [stat.groupId]: stat }));
  }, []);

  const myGroups = Object.values(stats);
  const activeGroups = myGroups.filter((g) => g.active && !g.finished);
  const totalStaked = myGroups.reduce((sum, g) => sum + g.staked, 0n);
  const totalReward = myGroups.reduce((sum, g) => sum + g.pendingReward, 0n);

  const claimableGroups = myGroups
    .filter((g) => g.staked > 0n || g.pendingReward > 0n)
    .sort((a, b) => b.groupId - a.groupId);

  function handleClaim(groupId: number) {
    if (!account) return;
    setClaimingId(groupId);
    sendTx(
      prepareContractCall({ contract: roscaContract, method: "claimStake", params: [BigInt(groupId)] }) as any,
      { onSettled: () => setClaimingId(null) }
    );
  }

  if (!account) {
    return <LandingPage />;
  }

  return (
    <main className="max-w-5xl mx-auto px-5 md:px-8 py-6">
      {account && allIds.map((id) => (
        <GroupStatsCollector key={id} groupId={id} account={account.address} onData={handleData} />
      ))}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-sand">
            {greeting} 👋
          </h1>
          <p className="text-sand/50 text-sm mt-1">Here's what's happening with your savings today.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon="$"
              label={t("walletBalance")}
              value={walletBalance ? `${formatUnits(walletBalance, 6)} USDC` : "—"}
            />
            <StatCard
              icon="💰"
              label={t("stakingBalance")}
              value={`${formatUnits(totalStaked, 6)} USDC`}
            sub={totalStaked > 0n ? "Across all groups" : "Earned after your payout turn"}
              accent="teal"
            />
            <StatCard
              icon="👥"
              label={t("activeGroups")}
              value={String(activeGroups.length)}
              sub="You are a member"
            />
            <StatCard
              icon="🎁"
              label={t("stakingReward")}
              value={`${formatUnits(totalReward, 6)} USDC`}
              sub="Pending, claimable at finish"
              accent="teal"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-3 mt-6">
            <div className="md:col-span-2 rounded-xl border border-sand/10 bg-indigo-800/40 p-5">
              <div className="font-mono text-xs uppercase tracking-wide text-sand/50">Quick actions</div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Link href="/create" className="focus-ring flex flex-col items-center gap-2 rounded-lg border border-sand/10 py-4 hover:border-gold-500/40">
                  <span className="w-10 h-10 rounded-full bg-gold-500 text-indigo-950 flex items-center justify-center text-lg">+</span>
                  <span className="text-xs text-sand/70">{t("createGroup")}</span>
                </Link>
                <Link href="/groups" className="focus-ring flex flex-col items-center gap-2 rounded-lg border border-sand/10 py-4 hover:border-gold-500/40">
                  <span className="w-10 h-10 rounded-full bg-teal-800 text-sand flex items-center justify-center text-lg">👥</span>
                  <span className="text-xs text-sand/70">{t("groups")}</span>
                </Link>
              </div>
            </div>
            <div className="rounded-xl border border-sand/10 bg-indigo-800/40 p-5">
              <div className="font-mono text-xs uppercase tracking-wide text-sand/50">How staking works</div>
              <p className="text-xs text-sand/60 mt-3 leading-relaxed">
                When your turn comes, you get 30% of the pot right away. The other 70% earns reward while
                staked, until the group finishes — then you claim it all. Miss a payment and it's covered
                automatically from your stake.
              </p>
            </div>
          </div>

      {claimableGroups.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-sand/40">Your Stakes</h2>
          </div>
          <div className="space-y-3">
            {claimableGroups.map((g) => {
              const hasShortfall = g.shortfall > 0n;
              const readyToClaim = g.finished && !hasShortfall;
              const amount = g.staked + g.pendingReward;
              const isThisPending = isClaiming && claimingId === g.groupId;

              return (
                <div
                  key={g.groupId}
                  className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${
                    readyToClaim
                      ? "border-gold-500/30 bg-gold-500/5"
                      : "border-sand/10 bg-indigo-800/40"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-sand/50">Group #{g.groupId}</div>
                    <div className="font-display text-lg text-sand mt-0.5">
                      {formatUnits(amount, g.decimals)} USDC
                    </div>
                    <div className="text-xs text-sand/40 mt-0.5">
                      {hasShortfall
                        ? "Outstanding shortfall must be paid first"
                        : g.finished
                        ? "Ready to claim"
                        : "Locked until the group finishes"}
                    </div>
                  </div>

                  {hasShortfall ? (
                    <Link
                      href={`/group/${g.groupId}`}
                      className="focus-ring shrink-0 rounded-full border border-red-400/40 text-red-300 text-sm font-medium px-5 py-2.5 hover:bg-red-500/10"
                    >
                      Resolve
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleClaim(g.groupId)}
                      disabled={!readyToClaim || isThisPending}
                      className={`focus-ring shrink-0 rounded-full text-sm font-medium px-5 py-2.5 transition-colors ${
                        readyToClaim
                          ? "bg-gold-500 text-indigo-950 hover:bg-gold-400"
                          : "bg-transparent border border-sand/15 text-sand/30 cursor-not-allowed"
                      }`}
                    >
                      {isThisPending ? "Claiming..." : readyToClaim ? "Claim" : "Locked"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-sand/40">My Groups</h2>
          <Link href="/groups" className="text-xs text-gold-500 font-mono">View all</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {allIds.slice(0, 3).map((id) => (
            <GroupCard key={id} groupId={id} />
          ))}
          {count === 0 && (
            <div className="md:col-span-3 rounded-xl border border-dashed border-sand/15 p-8 text-center text-sand/50">
              No groups yet. <Link href="/create" className="text-gold-500 underline">Create the first one</Link>.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
FILEEOF

echo "Writing frontend/components/GroupStatsCollector.tsx ..."
cat > frontend/components/GroupStatsCollector.tsx << 'FILEEOF'
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
FILEEOF

echo "Writing frontend/.env.local.example ..."
cat > frontend/.env.local.example << 'FILEEOF'
# Mainnet contract address — fill in after deploying RoscaCredit.sol to Arc Mainnet
NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS=0xYourMainnetContractAddress

# USDC ERC-20 interface on Arc Mainnet
NEXT_PUBLIC_TOKEN_ADDRESS=0x3600000000000000000000000000000000000000

# Testnet contract address — fill in after deploying RoscaCredit.sol to Arc Testnet
# (used when a user switches the in-app network toggle to "Testnet")
NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS_TESTNET=0xYourTestnetContractAddress

# USDC (or test) token address on Arc Testnet
NEXT_PUBLIC_TOKEN_ADDRESS_TESTNET=0x3600000000000000000000000000000000000000

# Get a free client ID at https://thirdweb.com/create-api-key
# This powers Google/email login (embedded wallet) and all contract calls.
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
FILEEOF

echo ""
echo "✅ Duk fayilolin 14 (network switcher) an rubuta su cikin nasara."
