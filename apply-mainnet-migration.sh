#!/data/data/com.termux/files/usr/bin/bash
# RoscaCredit: Arc Testnet -> Arc Mainnet migration
# Run this from inside the root of your cloned rosca-credit repo.
set -e

echo "Writing contracts/RoscaCredit.sol ..."
cat > contracts/RoscaCredit.sol << 'FILEEOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title RoscaCredit
/// @notice Rotating Savings and Credit Association (ROSCA / Ajo / Adashi) with
///         a built-in staking safety net:
///         - When a member's turn comes, they receive `payoutBps` of the pot
///           immediately (e.g. 30%), and the rest is auto-staked on their
///           behalf, earning `rewardRateBps` APY, until the group finishes.
///         - If a member misses a round's contribution, the missing amount
///           is automatically deducted from their staked balance so the
///           group keeps moving.
///         - Once the group finishes, every member can claim their
///           remaining staked balance plus any accrued reward.
contract RoscaCredit is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------- Custom errors (cheaper than require(string) on every call) ----------
    error Rosca_GroupNotFound();
    error Rosca_InvalidToken();
    error Rosca_AmountZero();
    error Rosca_NeedAtLeastTwoMembers();
    error Rosca_InvalidCycleDuration();
    error Rosca_InvalidPayoutBps();
    error Rosca_GroupFull();
    error Rosca_AlreadyMember();
    error Rosca_NotMember();
    error Rosca_NotActive();
    error Rosca_AlreadyFinished();
    error Rosca_AlreadyContributed();
    error Rosca_RoundStillOpen();
    error Rosca_NothingToSettle();
    error Rosca_NotFinished();
    error Rosca_OutstandingShortfall();
    error Rosca_NothingToClaim();
    error Rosca_NoShortfall();

    struct Group {
        string name;
        address admin;
        IERC20 token;
        uint256 contributionAmount;
        uint256 maxMembers;
        uint256 cycleDuration;
        uint256 roundStartTime;
        uint256 currentRound;
        bool active;
        bool finished;
        address[] members;
        uint256 potThisRound;
        uint16 payoutBps;      // e.g. 3000 = 30% paid out immediately, rest staked
        uint16 rewardRateBps;  // annual reward rate on staked balances, e.g. 500 = 5% APY
        uint256 rewardPool;    // remaining reward budget funded by admin at creation
    }

    uint256 public groupCount;
    mapping(uint256 => Group) private groups;

    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasContributed;
    mapping(uint256 => mapping(address => bool)) public isMember;

    // Staking ledger: groupId => member => amount
    mapping(uint256 => mapping(address => uint256)) public stakedBalance;
    mapping(uint256 => mapping(address => uint256)) public accruedReward;
    mapping(uint256 => mapping(address => uint256)) public lastCheckpoint;
    mapping(uint256 => mapping(address => uint256)) public outstandingShortfall;

    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant YEAR = 365 days;
    uint256 public constant REWARD_FEE_BPS = 100; // 1% of each round's pot self-funds the reward pool

    event GroupCreated(uint256 indexed groupId, address indexed admin, address token, uint256 contributionAmount, uint256 maxMembers, uint256 cycleDuration, uint16 payoutBps, uint16 rewardRateBps, uint256 rewardPoolDeposit);
    event MemberJoined(uint256 indexed groupId, address indexed member, uint256 position);
    event GroupActivated(uint256 indexed groupId, uint256 roundStartTime);
    event Contributed(uint256 indexed groupId, uint256 indexed round, address indexed member, uint256 amount);
    event MissedContribution(uint256 indexed groupId, uint256 indexed round, address indexed member, uint256 deductedFromStake, uint256 shortfall);
    event ShortfallPaid(uint256 indexed groupId, address indexed member, uint256 amount);
    event RoundSettled(uint256 indexed groupId, uint256 indexed round, address indexed recipient, uint256 immediatePayout, uint256 stakedPortion);
    event StakeClaimed(uint256 indexed groupId, address indexed member, uint256 principal, uint256 reward);
    event GroupFinished(uint256 indexed groupId);

    modifier groupExists(uint256 groupId) {
        if (groupId >= groupCount) revert Rosca_GroupNotFound();
        _;
    }

    /// @notice Create a new ROSCA group with a staking safety net.
    function createGroup(
        string calldata groupName,
        address token,
        uint256 contributionAmount,
        uint256 maxMembers,
        uint256 cycleDuration,
        uint16 payoutBps,
        uint16 rewardRateBps,
        uint256 rewardPoolDeposit
    ) external returns (uint256 groupId) {
        if (token == address(0)) revert Rosca_InvalidToken();
        if (contributionAmount == 0) revert Rosca_AmountZero();
        if (maxMembers < 2) revert Rosca_NeedAtLeastTwoMembers();
        if (cycleDuration == 0) revert Rosca_InvalidCycleDuration();
        if (payoutBps > BPS_DENOMINATOR) revert Rosca_InvalidPayoutBps();

        groupId = groupCount++;
        Group storage g = groups[groupId];
        g.name = groupName;
        g.admin = msg.sender;
        g.token = IERC20(token);
        g.contributionAmount = contributionAmount;
        g.maxMembers = maxMembers;
        g.cycleDuration = cycleDuration;
        g.payoutBps = payoutBps;
        g.rewardRateBps = rewardRateBps;

        if (rewardPoolDeposit > 0) {
            IERC20(token).safeTransferFrom(msg.sender, address(this), rewardPoolDeposit);
            g.rewardPool = rewardPoolDeposit;
        }

        g.members.push(msg.sender);
        isMember[groupId][msg.sender] = true;

        emit GroupCreated(groupId, msg.sender, token, contributionAmount, maxMembers, cycleDuration, payoutBps, rewardRateBps, rewardPoolDeposit);
        emit MemberJoined(groupId, msg.sender, 0);

        if (g.members.length == g.maxMembers) {
            _activate(groupId, g);
        }
    }

    /// @notice Join an existing group that has not yet filled up.
    function joinGroup(uint256 groupId) external groupExists(groupId) {
        Group storage g = groups[groupId];
        if (g.active) revert Rosca_GroupFull();
        if (isMember[groupId][msg.sender]) revert Rosca_AlreadyMember();
        if (g.members.length >= g.maxMembers) revert Rosca_GroupFull();

        g.members.push(msg.sender);
        isMember[groupId][msg.sender] = true;

        emit MemberJoined(groupId, msg.sender, g.members.length - 1);

        if (g.members.length == g.maxMembers) {
            _activate(groupId, g);
        }
    }

    function _activate(uint256 groupId, Group storage g) internal {
        g.active = true;
        g.roundStartTime = block.timestamp;
        emit GroupActivated(groupId, g.roundStartTime);
    }

    /// @notice Pay your contribution for the current round.
    function contribute(uint256 groupId) external nonReentrant groupExists(groupId) {
        Group storage g = groups[groupId];
        if (!g.active) revert Rosca_NotActive();
        if (g.finished) revert Rosca_AlreadyFinished();
        if (!isMember[groupId][msg.sender]) revert Rosca_NotMember();
        if (hasContributed[groupId][g.currentRound][msg.sender]) revert Rosca_AlreadyContributed();

        hasContributed[groupId][g.currentRound][msg.sender] = true;
        g.potThisRound += g.contributionAmount;

        g.token.safeTransferFrom(msg.sender, address(this), g.contributionAmount);

        emit Contributed(groupId, g.currentRound, msg.sender, g.contributionAmount);
    }

    /// @notice Settle the current round.
    function settleRound(uint256 groupId) external nonReentrant groupExists(groupId) {
        Group storage g = groups[groupId];
        if (!g.active) revert Rosca_NotActive();
        if (g.finished) revert Rosca_AlreadyFinished();

        bool deadlinePassed = block.timestamp >= g.roundStartTime + g.cycleDuration;
        uint256 round = g.currentRound;
        uint256 len = g.members.length;

        bool everyoneSettled = true;
        for (uint256 i = 0; i < len; ) {
            address m = g.members[i];
            if (!hasContributed[groupId][round][m]) {
                if (!deadlinePassed) {
                    everyoneSettled = false;
                    break;
                }
                _accrue(groupId, m, g);
                uint256 available = stakedBalance[groupId][m];
                uint256 needed = g.contributionAmount;
                uint256 deducted = available < needed ? available : needed;
                if (deducted > 0) {
                    stakedBalance[groupId][m] = available - deducted;
                    g.potThisRound += deducted;
                }
                uint256 shortfall = needed - deducted;
                if (shortfall > 0) {
                    outstandingShortfall[groupId][m] += shortfall;
                }
                hasContributed[groupId][round][m] = true;
                emit MissedContribution(groupId, round, m, deducted, shortfall);
            }
            unchecked { ++i; }
        }

        if (!everyoneSettled && !deadlinePassed) revert Rosca_RoundStillOpen();
        if (g.potThisRound == 0) revert Rosca_NothingToSettle();

        address recipient = g.members[round];
        uint256 pot = g.potThisRound;
        g.potThisRound = 0;

        uint256 rewardFee = (pot * REWARD_FEE_BPS) / BPS_DENOMINATOR;
        g.rewardPool += rewardFee;
        uint256 distributable = pot - rewardFee;

        uint256 immediatePayout = (distributable * g.payoutBps) / BPS_DENOMINATOR;
        uint256 stakedPortion = distributable - immediatePayout;

        g.currentRound = round + 1;
        g.roundStartTime = block.timestamp;

        if (immediatePayout > 0) {
            g.token.safeTransfer(recipient, immediatePayout);
        }
        if (stakedPortion > 0) {
            _accrue(groupId, recipient, g);
            stakedBalance[groupId][recipient] += stakedPortion;
        }

        emit RoundSettled(groupId, round, recipient, immediatePayout, stakedPortion);

        if (g.currentRound == g.maxMembers) {
            g.finished = true;
            emit GroupFinished(groupId);
        }
    }

    /// @notice Claim your staked balance plus any accrued reward.
    function claimStake(uint256 groupId) external nonReentrant groupExists(groupId) {
        Group storage g = groups[groupId];
        if (!g.finished) revert Rosca_NotFinished();
        if (!isMember[groupId][msg.sender]) revert Rosca_NotMember();
        if (outstandingShortfall[groupId][msg.sender] != 0) revert Rosca_OutstandingShortfall();

        _accrue(groupId, msg.sender, g);

        uint256 principal = stakedBalance[groupId][msg.sender];
        uint256 reward = accruedReward[groupId][msg.sender];
        if (principal + reward == 0) revert Rosca_NothingToClaim();

        stakedBalance[groupId][msg.sender] = 0;
        accruedReward[groupId][msg.sender] = 0;

        g.token.safeTransfer(msg.sender, principal + reward);

        emit StakeClaimed(groupId, msg.sender, principal, reward);
    }

    /// @notice Pay down any outstanding shortfall.
    function payShortfall(uint256 groupId) external nonReentrant groupExists(groupId) {
        Group storage g = groups[groupId];
        if (!isMember[groupId][msg.sender]) revert Rosca_NotMember();
        uint256 owed = outstandingShortfall[groupId][msg.sender];
        if (owed == 0) revert Rosca_NoShortfall();

        outstandingShortfall[groupId][msg.sender] = 0;
        g.token.safeTransferFrom(msg.sender, address(this), owed);
        g.rewardPool += owed;

        emit ShortfallPaid(groupId, msg.sender, owed);
    }

    function _accrue(uint256 groupId, address member, Group storage g) internal {
        uint256 last = lastCheckpoint[groupId][member];
        if (last == 0) {
            lastCheckpoint[groupId][member] = block.timestamp;
            return;
        }
        uint256 elapsed = block.timestamp - last;
        uint256 bal = stakedBalance[groupId][member];
        if (bal > 0 && g.rewardRateBps > 0 && elapsed > 0) {
            uint256 reward = (bal * g.rewardRateBps * elapsed) / (BPS_DENOMINATOR * YEAR);
            uint256 pool = g.rewardPool;
            if (reward > pool) reward = pool;
            if (reward > 0) {
                accruedReward[groupId][member] += reward;
                g.rewardPool = pool - reward;
            }
        }
        lastCheckpoint[groupId][member] = block.timestamp;
    }

    // ---------- View helpers ----------

    function getGroup(uint256 groupId) external view groupExists(groupId) returns (
        address admin,
        address token,
        uint256 contributionAmount,
        uint256 maxMembers,
        uint256 cycleDuration,
        uint256 roundStartTime,
        uint256 currentRound,
        bool active,
        bool finished,
        uint256 potThisRound,
        uint256 memberCount
    ) {
        Group storage g = groups[groupId];
        admin = g.admin;
        token = address(g.token);
        contributionAmount = g.contributionAmount;
        maxMembers = g.maxMembers;
        cycleDuration = g.cycleDuration;
        roundStartTime = g.roundStartTime;
        currentRound = g.currentRound;
        active = g.active;
        finished = g.finished;
        potThisRound = g.potThisRound;
        memberCount = g.members.length;
    }

    function getGroupStaking(uint256 groupId) external view groupExists(groupId) returns (
        uint16 payoutBps,
        uint16 rewardRateBps,
        uint256 rewardPool
    ) {
        Group storage g = groups[groupId];
        payoutBps = g.payoutBps;
        rewardRateBps = g.rewardRateBps;
        rewardPool = g.rewardPool;
    }

    function getGroupName(uint256 groupId) external view groupExists(groupId) returns (string memory) {
        return groups[groupId].name;
    }

    function getMembers(uint256 groupId) external view groupExists(groupId) returns (address[] memory) {
        return groups[groupId].members;
    }

    function getRoundStatus(uint256 groupId, uint256 round) external view groupExists(groupId) returns (bool[] memory contributed) {
        Group storage g = groups[groupId];
        uint256 len = g.members.length;
        contributed = new bool[](len);
        for (uint256 i = 0; i < len; ) {
            contributed[i] = hasContributed[groupId][round][g.members[i]];
            unchecked { ++i; }
        }
    }

    function getStakeInfo(uint256 groupId, address member) external view groupExists(groupId) returns (
        uint256 principal,
        uint256 pendingReward,
        uint256 shortfall
    ) {
        Group storage g = groups[groupId];
        principal = stakedBalance[groupId][member];
        pendingReward = accruedReward[groupId][member];
        shortfall = outstandingShortfall[groupId][member];

        uint256 last = lastCheckpoint[groupId][member];
        if (last > 0 && principal > 0 && g.rewardRateBps > 0) {
            uint256 elapsed = block.timestamp - last;
            uint256 projected = (principal * g.rewardRateBps * elapsed) / (BPS_DENOMINATOR * YEAR);
            if (projected > g.rewardPool) projected = g.rewardPool;
            pendingReward += projected;
        }
    }
}
FILEEOF

echo "Writing hardhat.config.js ..."
cat > hardhat.config.js << 'FILEEOF'
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    arcTestnet: {
      url: "https://5042002.rpc.thirdweb.com",
      chainId: 5042002,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    arcMainnet: {
      url: "https://rpc.mainnet.arc.io",
      chainId: 5042,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
FILEEOF

echo "Writing scripts/deploy.js ..."
cat > scripts/deploy.js << 'FILEEOF'
const hre = require("hardhat");

async function main() {
  console.log("Deploying RoscaCredit to Arc Mainnet...");

  const RoscaCredit = await hre.ethers.getContractFactory("RoscaCredit");
  const rosca = await RoscaCredit.deploy();
  await rosca.waitForDeployment();

  const address = await rosca.getAddress();
  console.log("RoscaCredit deployed to:", address);
  console.log("Explorer:", `https://explorer.arc.io/address/${address}`);
  console.log("\nSave this address into frontend/.env.local as NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
FILEEOF

echo "Writing frontend/.env.local.example ..."
cat > frontend/.env.local.example << 'FILEEOF'
# Address of RoscaCredit.sol after you deploy it to Arc Mainnet
NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS=0xYourDeployedContractAddress

# USDC ERC-20 interface on Arc Mainnet (same address on every Arc network)
NEXT_PUBLIC_TOKEN_ADDRESS=0x3600000000000000000000000000000000000000

# Get a free client ID at https://thirdweb.com/create-api-key
# This powers Google/email login (embedded wallet) and all contract calls.
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
FILEEOF

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
FILEEOF

echo "Writing frontend/lib/contract.ts ..."
cat > frontend/lib/contract.ts << 'FILEEOF'
// Fill this in after running `npm run deploy` in the contracts project.
export const ROSCA_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// Default USDC token on Arc Mainnet — replace if you use a different
// ERC20 for contributions. Members must approve() this token before contributing.
export const DEFAULT_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

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

echo "Writing frontend/lib/hooks.ts ..."
cat > frontend/lib/hooks.ts << 'FILEEOF'
"use client";

import { getContract } from "thirdweb";
import { useReadContract } from "thirdweb/react";
import { client } from "@/lib/thirdwebClient";
import { arcMainnet } from "@/lib/chain";
import { ROSCA_ABI, ROSCA_CONTRACT_ADDRESS, ERC20_ABI } from "@/lib/contract";

export const roscaContract = getContract({
  client,
  chain: arcMainnet,
  address: ROSCA_CONTRACT_ADDRESS,
  abi: ROSCA_ABI as any,
});

export function tokenContract(token: `0x${string}`) {
  return getContract({ client, chain: arcMainnet, address: token, abi: ERC20_ABI as any });
}

// Every on-chain read below polls periodically so the dashboard and group
// pages reflect fresh state (e.g. right after a contribution or settleRound)
// instead of showing stale cached values until a manual page reload.
const POLL = { refetchInterval: 8000, staleTime: 0 };

export function useGroupCount() {
  return useReadContract({ contract: roscaContract, method: "groupCount", params: [], queryOptions: POLL });
}

export function useGroup(groupId: number) {
  return useReadContract({
    contract: roscaContract,
    method: "getGroup",
    params: [BigInt(groupId)],
    queryOptions: POLL,
  });
}

export function useGroupStaking(groupId: number) {
  return useReadContract({
    contract: roscaContract,
    method: "getGroupStaking",
    params: [BigInt(groupId)],
    queryOptions: POLL,
  });
}

export function useGroupName(groupId: number) {
  return useReadContract({
    contract: roscaContract,
    method: "getGroupName",
    params: [BigInt(groupId)],
  });
}

export function useMembers(groupId: number) {
  return useReadContract({
    contract: roscaContract,
    method: "getMembers",
    params: [BigInt(groupId)],
    queryOptions: POLL,
  });
}

export function useRoundStatus(groupId: number, round: number) {
  return useReadContract({
    contract: roscaContract,
    method: "getRoundStatus",
    params: [BigInt(groupId), BigInt(round)],
    queryOptions: POLL,
  });
}

export function useStakeInfo(groupId: number, member?: string) {
  return useReadContract({
    contract: roscaContract,
    method: "getStakeInfo",
    params: [BigInt(groupId), (member ?? "0x0000000000000000000000000000000000000000") as `0x${string}`],
    queryOptions: { enabled: !!member, ...POLL },
  });
}

export function useTokenDecimals(token: `0x${string}`) {
  return useReadContract({
    contract: tokenContract(token),
    method: "decimals",
    params: [],
    queryOptions: { enabled: !!token && token !== "0x0000000000000000000000000000000000000000" },
  });
}

export function useTokenSymbol(token: `0x${string}`) {
  return useReadContract({
    contract: tokenContract(token),
    method: "symbol",
    params: [],
    queryOptions: { enabled: !!token && token !== "0x0000000000000000000000000000000000000000" },
  });
}

export function useTokenBalance(token: `0x${string}`, owner?: string) {
  return useReadContract({
    contract: tokenContract(token),
    method: "balanceOf",
    params: [(owner ?? "0x0000000000000000000000000000000000000000") as `0x${string}`],
    queryOptions: { enabled: !!owner, ...POLL },
  });
}
FILEEOF

echo "Writing frontend/components/ConnectWallet.tsx ..."
cat > frontend/components/ConnectWallet.tsx << 'FILEEOF'
"use client";

import { ConnectButton, darkTheme } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdwebClient";
import { arcMainnet } from "@/lib/chain";

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
      chain={arcMainnet}
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

      <div className="space-y-1 pt-4 border-t border-sand/10">
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

        <div className="mt-3 rounded-lg border border-sand/10 px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gold-500" />
          <div className="text-[11px] font-mono">
            <div className="text-sand/60">Arc</div>
            <div className="text-sand/40">
              {account ? `${account.address.slice(0, 6)}…${account.address.slice(-4)}` : "Not connected"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
FILEEOF

echo "Writing frontend/components/LandingPage.tsx ..."
cat > frontend/components/LandingPage.tsx << 'FILEEOF'
"use client";

import { ConnectWallet } from "@/components/ConnectWallet";
import { LogoMark } from "@/components/Logo";

const FEATURES = [
  {
    icon: "🛡️",
    title: "Trustless",
    desc: "Smart contracts secure everyone's contributions – no admin can run off with the pot.",
  },
  {
    icon: "⚡",
    title: "Fast & Cheap",
    desc: "Built on Arc for lightning speed and near-zero fees.",
  },
  {
    icon: "🤝",
    title: "Together",
    desc: "Community first. Everyone's stake keeps the group moving, even if someone misses a round.",
  },
];

const PANEL_POINTS = [
  { icon: "🔒", title: "Secure & Non-Custodial", desc: "Your funds are locked in smart contracts, not held by us." },
  { icon: "💳", title: "Automatic Wallet", desc: "A wallet is created for you on Arc – no setup needed." },
  { icon: "🔑", title: "No Private Keys", desc: "We abstract the complexity away. You just sign in and go." },
];

export function LandingPage() {
  return (
    <main className="max-w-6xl mx-auto px-5 md:px-10 py-10 md:py-16">
      <div className="grid lg:grid-cols-2 gap-10 items-start">
        {/* Left: hero */}
        <div>
          <div className="flex items-center gap-3">
            <LogoMark size={44} />
            <div>
              <div className="font-display font-bold text-2xl text-sand leading-none">Rosca-Credit</div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-gold-500 uppercase mt-1">
                On-chain rotating savings
              </div>
            </div>
          </div>

          <h1 className="font-display font-bold text-4xl md:text-5xl text-sand mt-8 leading-tight">
            Collect. Save. Grow. <span className="text-gold-500">Together.</span>
          </h1>

          <p className="text-sand/60 mt-5 max-w-md leading-relaxed">
            Rosca-Credit transforms traditional community savings into secure, transparent,
            and decentralized financial groups powered by the @Arc Blockchain
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mt-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-sand/10 bg-indigo-800/40 p-4">
                <div className="text-xl">{f.icon}</div>
                <div className="text-sand font-medium text-sm mt-2">{f.title}</div>
                <div className="text-sand/50 text-xs mt-1 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: sign-in panel */}
        <div className="rounded-2xl border border-sand/10 bg-indigo-800/40 p-6 md:p-8 lg:sticky lg:top-10">
          <div className="text-center">
            <LogoMark size={48} />
            <h2 className="font-display text-xl text-sand mt-4">Welcome to Rosca-Credit</h2>
            <p className="text-sand/50 text-sm mt-2">
              Join thousands building trust and wealth together.
            </p>
          </div>

          <div className="mt-6 flex justify-center [&>div]:w-full [&_button]:w-full">
            <ConnectWallet />
          </div>

          <div className="mt-8 space-y-4">
            {PANEL_POINTS.map((p) => (
              <div key={p.title} className="flex items-start gap-3">
                <span className="text-lg shrink-0" aria-hidden>{p.icon}</span>
                <div>
                  <div className="text-sand text-sm font-medium">{p.title}</div>
                  <div className="text-sand/50 text-xs mt-0.5">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] text-sand/30 mt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      {/* Follow us on X */}
      <div className="mt-10 flex justify-center">
        <a
          href="https://x.com/RoscaCredit"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-sand/10 px-4 py-2 text-sand/70 text-sm hover:border-gold-500/40 hover:text-sand transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Follow us on X
        </a>
      </div>
    </main>
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
import { DEFAULT_TOKEN_ADDRESS } from "@/lib/contract";
import { useLanguage } from "@/contexts/LanguageContext";
import { client } from "@/lib/thirdwebClient";
import { arcMainnet } from "@/lib/chain";

type Panel = "none" | "deposit" | "withdraw";

export default function WalletPage() {
  const account = useActiveAccount();
  const { t } = useLanguage();
  const { data: balance, refetch: refetchBalance } = useTokenBalance(DEFAULT_TOKEN_ADDRESS, account?.address);
  const { data: symbol } = useTokenSymbol(DEFAULT_TOKEN_ADDRESS);

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
      chain: arcMainnet,
      client,
      value: toUnits(amount, 18), // native USDC uses 18 decimals on Arc
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

echo "Writing frontend/app/activity/page.tsx ..."
cat > frontend/app/activity/page.tsx << 'FILEEOF'
"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveAccount, useContractEvents } from "thirdweb/react";
import { formatUnits } from "@/lib/units";
import { useLanguage } from "@/contexts/LanguageContext";
import { roscaContract } from "@/lib/hooks";
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

  const { data: contributed } = useContractEvents({ contract: roscaContract, events: [contributedEvent] });
  const { data: missed } = useContractEvents({ contract: roscaContract, events: [missedContributionEvent] });
  const { data: settled } = useContractEvents({ contract: roscaContract, events: [roundSettledEvent] });
  const { data: claimed } = useContractEvents({ contract: roscaContract, events: [stakeClaimedEvent] });

  // Best-effort: raw wallet-level sends/receives from the block explorer.
  // Wrapped defensively so a failed/blocked request never breaks the page.
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
          `https://explorer.arc.io/api/v2/addresses/${account.address}/transactions`
        );
        if (!res.ok) return;
        const json = await res.json();
        const items: FeedItem[] = (json?.items ?? [])
          .map((tx: any): FeedItem | null => {
            try {
              const isSent = tx.from?.hash?.toLowerCase() === account.address.toLowerCase();
              const valueWei = BigInt(tx.value ?? "0");
              if (valueWei === 0n) return null; // skip zero-value contract calls to keep the feed readable
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
  }, [account]);

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
          href={`https://explorer.arc.io/address/${account.address}`}
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

echo ""
echo "✅ Duk fayilolin 12 an rubuta su cikin nasara."
echo "Yanzu bincika: git status"
