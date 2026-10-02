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
