import { prepareEvent } from "thirdweb";

export const contributedEvent = prepareEvent({
  signature:
    "event Contributed(uint256 indexed groupId, uint256 indexed round, address indexed member, uint256 amount)",
});

export const missedContributionEvent = prepareEvent({
  signature:
    "event MissedContribution(uint256 indexed groupId, uint256 indexed round, address indexed member, uint256 deductedFromStake, uint256 shortfall)",
});

export const roundSettledEvent = prepareEvent({
  signature:
    "event RoundSettled(uint256 indexed groupId, uint256 indexed round, address indexed recipient, uint256 immediatePayout, uint256 stakedPortion)",
});

export const stakeClaimedEvent = prepareEvent({
  signature:
    "event StakeClaimed(uint256 indexed groupId, address indexed member, uint256 principal, uint256 reward)",
});
