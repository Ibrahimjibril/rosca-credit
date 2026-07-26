"use client";

import { ConnectButton, darkTheme } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdwebClient";
import { arcTestnet } from "@/lib/chain";
import { DEFAULT_TOKEN_ADDRESS } from "@/lib/contract";

// Google/email login creates a non-custodial embedded wallet automatically —
// no MetaMask required. We also allow MetaMask/WalletConnect as a fallback
// for people who already have a crypto wallet.
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
  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      chain={arcTestnet}
      theme={roscaTheme}
      connectModal={{ size: "compact", title: "Sign in to Rosca_Credit" }}
      connectButton={{ label: "Continue with Google" }}
      detailsButton={{
        displayBalanceToken: {
          [arcTestnet.id]: DEFAULT_TOKEN_ADDRESS,
        },
      }}
    />
  );
}
