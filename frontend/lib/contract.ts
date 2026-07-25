// Fill this in after running `npm run deploy` in the contracts project.
export const ROSCA_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// Default USDC test token on Arc Testnet — replace if you use a different
// ERC20 for contributions. Members must approve() this token before contributing.
export const DEFAULT_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const ROSCA_ABI = [
  {
    type: "function",
    name: "createGroup",
    stateMutability: "nonpayable",
    inputs: [
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
    ],
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
