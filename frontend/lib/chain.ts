import { defineChain } from "thirdweb/chains";

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
