// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title RoscaCredit
/// @notice Rotating Savings and Credit Association (ROSCA / Ajo / Adashi) dApp.
///         Members join a group, contribute a fixed amount each round in a
///         stablecoin (e.g. USDC), and one member receives the full pot each
///         round in join order (first to join, first to be paid).
contract RoscaCredit is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Group {
        address admin;
        IERC20 token;
        uint256 contributionAmount; // amount each member pays per round
        uint256 maxMembers;         // group size = number of rounds
        uint256 cycleDuration;      // seconds per round, set by admin
        uint256 roundStartTime;     // timestamp the current round began
        uint256 currentRound;       // 0-indexed; group finishes when == maxMembers
        bool active;                // true once maxMembers have joined
        bool finished;              // true once every member has been paid
        address[] members;          // ordered by join sequence = payout order
        uint256 potThisRound;        // amount collected so far in current round
    }

    uint256 public groupCount;
    mapping(uint256 => Group) private groups;
    // groupId => round => member => contributed?
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasContributed;
    // groupId => member => isMember?
    mapping(uint256 => mapping(address => bool)) public isMember;

    event GroupCreated(uint256 indexed groupId, address indexed admin, address token, uint256 contributionAmount, uint256 maxMembers, uint256 cycleDuration);
    event MemberJoined(uint256 indexed groupId, address indexed member, uint256 position);
    event GroupActivated(uint256 indexed groupId, uint256 roundStartTime);
    event Contributed(uint256 indexed groupId, uint256 indexed round, address indexed member, uint256 amount);
    event PayoutSent(uint256 indexed groupId, uint256 indexed round, address indexed recipient, uint256 amount);
    event GroupFinished(uint256 indexed groupId);

    modifier groupExists(uint256 groupId) {
        require(groupId < groupCount, "Rosca: group does not exist");
        _;
    }

    /// @notice Create a new ROSCA group. Caller becomes admin and first member.
    /// @param token ERC20 token used for contributions (e.g. USDC on Arc)
    /// @param contributionAmount amount each member pays every round
    /// @param maxMembers number of members / number of rounds
    /// @param cycleDuration length of each round in seconds, chosen by admin
    function createGroup(
        address token,
        uint256 contributionAmount,
        uint256 maxMembers,
        uint256 cycleDuration
    ) external returns (uint256 groupId) {
        require(token != address(0), "Rosca: invalid token");
        require(contributionAmount > 0, "Rosca: amount must be > 0");
        require(maxMembers >= 2, "Rosca: need at least 2 members");
        require(cycleDuration > 0, "Rosca: cycle duration must be > 0");

        groupId = groupCount++;
        Group storage g = groups[groupId];
        g.admin = msg.sender;
        g.token = IERC20(token);
        g.contributionAmount = contributionAmount;
        g.maxMembers = maxMembers;
        g.cycleDuration = cycleDuration;

        g.members.push(msg.sender);
        isMember[groupId][msg.sender] = true;

        emit GroupCreated(groupId, msg.sender, token, contributionAmount, maxMembers, cycleDuration);
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

    /// @notice Trigger payout for the current round once every member has
    ///         contributed, or once the cycle duration has elapsed (whoever
    ///         has contributed pays in; late members forfeit that round's pot
    ///         share stays in contract, matching real ROSCA "miss your turn" risk).
    ///         Anyone can call this to move the group forward.
    function payout(uint256 groupId) external nonReentrant groupExists(groupId) {
        Group storage g = groups[groupId];
        require(g.active, "Rosca: group not active yet");
        require(!g.finished, "Rosca: group already finished");

        bool everyoneContributed = true;
        uint256 len = g.members.length;
        for (uint256 i = 0; i < len; i++) {
            if (!hasContributed[groupId][g.currentRound][g.members[i]]) {
                everyoneContributed = false;
                break;
            }
        }

        bool deadlinePassed = block.timestamp >= g.roundStartTime + g.cycleDuration;
        require(everyoneContributed || deadlinePassed, "Rosca: round still open");
        require(g.potThisRound > 0, "Rosca: nothing to pay out");

        address recipient = g.members[g.currentRound];
        uint256 amount = g.potThisRound;
        g.potThisRound = 0;

        g.currentRound += 1;
        g.roundStartTime = block.timestamp;

        g.token.safeTransfer(recipient, amount);
        emit PayoutSent(groupId, g.currentRound - 1, recipient, amount);

        if (g.currentRound == g.maxMembers) {
            g.finished = true;
            emit GroupFinished(groupId);
        }
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
        return (
            g.admin,
            address(g.token),
            g.contributionAmount,
            g.maxMembers,
            g.cycleDuration,
            g.roundStartTime,
            g.currentRound,
            g.active,
            g.finished,
            g.potThisRound,
            g.members.length
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
}
