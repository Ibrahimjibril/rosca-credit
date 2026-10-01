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
