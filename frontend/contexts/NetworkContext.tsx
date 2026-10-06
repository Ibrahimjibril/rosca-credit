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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "mainnet" || saved === "testnet") setNetworkState(saved);
    } catch {
      // ignore — defaults to mainnet
    }
    setReady(true);
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

  if (!ready) return null;

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used within NetworkProvider");
  return ctx;
}
