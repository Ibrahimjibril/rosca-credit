const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // thirdweb's wallet bundle transitively references Coinbase's optional
    // x402 payment-protocol packages (many sub-paths: @x402/evm, @x402/svm/*,
    // @x402/core/*, etc.), none of which are installed and none of which are
    // needed for Google/email login, MetaMask, or WalletConnect. Ignore the
    // entire @x402/* namespace instead of the build failing on each subpath.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@x402\//,
      })
    );
    return config;
  },
};

module.exports = nextConfig;
