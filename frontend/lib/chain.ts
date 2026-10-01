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
