// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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

    struct Group {
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

    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant YEAR = 365 days;

    event GroupCreated(uint256 indexed groupId, address indexed admin, address token, uint256 contributionAmount, uint256 maxMembers, uint256 cycleDuration, uint16 payoutBps, uint16 rewardRateBps, uint256 rewardPoolDeposit);
    event MemberJoined(uint256 indexed groupId, address indexed member, uint256 position);
    event GroupActivated(uint256 indexed groupId, uint256 roundStartTime);
    event Contributed(uint256 indexed groupId, uint256 indexed round, address indexed member, uint256 amount);
    event MissedContribution(uint256 indexed groupId, uint256 indexed round, address indexed member, uint256 deductedFromStake, uint256 shortfall);
    event RoundSettled(uint256 indexed groupId, uint256 indexed round, address indexed recipient, uint256 immediatePayout, uint256 stakedPortion);
    event StakeClaimed(uint256 indexed groupId, address indexed member, uint256 principal, uint256 reward);
    event GroupFinished(uint256 indexed groupId);

    modifier groupExists(uint256 groupId) {
        require(groupId < groupCount, "Rosca: group does not exist");
        _;
    }

    /// @notice Create a new ROSCA group with a staking safety net.
    /// @param token ERC20 token used for contributions and staking (e.g. USDC)
    /// @param contributionAmount amount each member pays every round
    /// @param maxMembers number of members / number of rounds
    /// @param cycleDuration length of each round in seconds, chosen by admin
    /// @param payoutBps share of each round's pot paid out immediately to the
    ///        recipient, in basis points (e.g. 3000 = 30%). The remainder is staked.
    /// @param rewardRateBps annual reward rate paid on staked balances, in basis points
    /// @param rewardPoolDeposit amount of `token` the admin funds upfront to pay staking rewards
    function createGroup(
        address token,
        uint256 contributionAmount,
        uint256 maxMembers,
        uint256 cycleDuration,
        uint16 payoutBps,
        uint16 rewardRateBps,
        uint256 rewardPoolDeposit
    ) external returns (uint256 groupId) {
        require(token != address(0), "Rosca: invalid token");
        require(contributionAmount > 0, "Rosca: amount must be > 0");
        require(maxMembers >= 2, "Rosca: need at least 2 members");
        require(cycleDuration > 0, "Rosca: cycle duration must be > 0");
        require(payoutBps <= BPS_DENOMINATOR, "Rosca: payoutBps must be <= 10000");

        groupId = groupCount++;
        Group storage g = groups[groupId];
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
        require(!g.active, "Rosca: group already full/active");
        require(!isMember[groupId][msg.sender], "Rosca: already a member");
        require(g.members.length < g.maxMembers, "Rosca: group is full");

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
        require(g.active, "Rosca: group not active yet");
        require(!g.finished, "Rosca: group already finished");
        require(isMember[groupId][msg.sender], "Rosca: not a member");
        require(!hasContributed[groupId][g.currentRound][msg.sender], "Rosca: already contributed this round");

        hasContributed[groupId][g.currentRound][msg.sender] = true;
        g.potThisRound += g.contributionAmount;

        g.token.safeTransferFrom(msg.sender, address(this), g.contributionAmount);

        emit Contributed(groupId, g.currentRound, msg.sender, g.contributionAmount);
    }

    /// @notice Settle the current round: auto-deducts missed contributions
    ///         from members' staked balances, pays `payoutBps` of the pot to
    ///         this round's recipient immediately, and stakes the rest on
    ///         their behalf. Callable by anyone once every member has either
    ///         contributed or the round deadline has passed.
    function settleRound(uint256 groupId) external nonReentrant groupExists(groupId) {
        Group storage g = groups[groupId];
        require(g.active, "Rosca: group not active yet");
        require(!g.finished, "Rosca: group already finished");

        bool deadlinePassed = block.timestamp >= g.roundStartTime + g.cycleDuration;
        uint256 len = g.members.length;

        bool everyoneSettled = true;
        for (uint256 i = 0; i < len; i++) {
            address m = g.members[i];
            if (!hasContributed[groupId][g.currentRound][m]) {
                if (!deadlinePassed) {
                    everyoneSettled = false;
                    break;
                }
                // Deadline passed and member hasn't paid in — pull from their stake.
                _accrue(groupId, m, g);
                uint256 available = stakedBalance[groupId][m];
                uint256 needed = g.contributionAmount;
                uint256 deducted = available < needed ? available : needed;
                if (deducted > 0) {
                    stakedBalance[groupId][m] -= deducted;
                    g.potThisRound += deducted;
                }
                hasContributed[groupId][g.currentRound][m] = true; // mark settled either way
                emit MissedContribution(groupId, g.currentRound, m, deducted, needed - deducted);
            }
        }

        require(everyoneSettled || deadlinePassed, "Rosca: round still open");
        require(g.potThisRound > 0, "Rosca: nothing to settle");

        address recipient = g.members[g.currentRound];
        uint256 pot = g.potThisRound;
        g.potThisRound = 0;

        uint256 immediatePayout = (pot * g.payoutBps) / BPS_DENOMINATOR;
        uint256 stakedPortion = pot - immediatePayout;

        g.currentRound += 1;
        g.roundStartTime = block.timestamp;

        if (immediatePayout > 0) {
            g.token.safeTransfer(recipient, immediatePayout);
        }
        if (stakedPortion > 0) {
            _accrue(groupId, recipient, g);
            stakedBalance[groupId][recipient] += stakedPortion;
        }

        emit RoundSettled(groupId, g.currentRound - 1, recipient, immediatePayout, stakedPortion);

        if (g.currentRound == g.maxMembers) {
            g.finished = true;
            emit GroupFinished(groupId);
        }
    }

    /// @notice Claim your staked balance plus any accrued reward. Available
    ///         once the group has finished all its rounds.
    function claimStake(uint256 groupId) external nonReentrant groupExists(groupId) {
        Group storage g = groups[groupId];
        require(g.finished, "Rosca: group not finished yet");
        require(isMember[groupId][msg.sender], "Rosca: not a member");

        _accrue(groupId, msg.sender, g);

        uint256 principal = stakedBalance[groupId][msg.sender];
        uint256 reward = accruedReward[groupId][msg.sender];
        require(principal + reward > 0, "Rosca: nothing to claim");

        stakedBalance[groupId][msg.sender] = 0;
        accruedReward[groupId][msg.sender] = 0;

        g.token.safeTransfer(msg.sender, principal + reward);

        emit StakeClaimed(groupId, msg.sender, principal, reward);
    }

    /// @dev Checkpoints accrued reward for a member's current staked balance
    ///      before that balance changes, capped by the group's remaining reward pool.
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
            if (reward > g.rewardPool) reward = g.rewardPool;
            if (reward > 0) {
                accruedReward[groupId][member] += reward;
                g.rewardPool -= reward;
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
        uint256 memberCount,
        uint16 payoutBps,
        uint16 rewardRateBps,
        uint256 rewardPool
    ) {
        Group storage g = groups[groupId];
        return (
            g.admin, address(g.token), g.contributionAmount, g.maxMembers, g.cycleDuration,
            g.roundStartTime, g.currentRound, g.active, g.finished, g.potThisRound,
            g.members.length, g.payoutBps, g.rewardRateBps, g.rewardPool
        );
    }

    function getMembers(uint256 groupId) external view groupExists(groupId) returns (address[] memory) {
        return groups[groupId].members;
    }

    function getRoundStatus(uint256 groupId, uint256 round) external view groupExists(groupId) returns (bool[] memory contributed) {
        Group storage g = groups[groupId];
        contributed = new bool[](g.members.length);
        for (uint256 i = 0; i < g.members.length; i++) {
            contributed[i] = hasContributed[groupId][round][g.members[i]];
        }
    }

    /// @notice View-only projection of a member's stake + reward as of now
    ///         (does not mutate state; the real accrual happens on-write).
    function getStakeInfo(uint256 groupId, address member) external view groupExists(groupId) returns (
        uint256 principal,
        uint256 pendingReward
    ) {
        Group storage g = groups[groupId];
        principal = stakedBalance[groupId][member];
        pendingReward = accruedReward[groupId][member];

        uint256 last = lastCheckpoint[groupId][member];
        if (last > 0 && principal > 0 && g.rewardRateBps > 0) {
            uint256 elapsed = block.timestamp - last;
            uint256 projected = (principal * g.rewardRateBps * elapsed) / (BPS_DENOMINATOR * YEAR);
            if (projected > g.rewardPool) projected = g.rewardPool;
            pendingReward += projected;
        }
    }
}
