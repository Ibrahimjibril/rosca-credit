/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // thirdweb's wallet bundle transitively references Coinbase's optional
    // x402 payment-protocol packages, which aren't installed and aren't
    // needed for Google/email login, MetaMask, or WalletConnect. Tell
    // webpack to treat them as empty modules instead of failing the build.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/evm": false,
      "@x402/svm/exact/client": false,
    };
    return config;
  },
};

module.exports = nextConfig;
