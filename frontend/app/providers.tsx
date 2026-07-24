"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { arcTestnet } from "@/lib/chain";

const config = getDefaultConfig({
  appName: "Rosca_Credit",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "rosca-credit-dev",
  chains: [arcTestnet],
  ssr: true,
});

const queryClient = new QueryClient();

const roscaTheme = darkTheme({
  accentColor: "#E8A33D",
  accentColorForeground: "#1B1F3B",
  borderRadius: "medium",
  fontStack: "system",
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={roscaTheme} initialChain={arcTestnet}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
