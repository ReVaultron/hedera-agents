export const VOLATILITY_INDEX_ABI = [
  "function updateVolatility(bytes[] calldata priceUpdate, bytes32 feedId, uint256 volatilityBps) external payable",
  "function getVolatilityData(bytes32 feedId) external view returns (tuple(uint256 volatilityBps, int64 price, uint64 confidence, int32 expo, uint256 timestamp))",
  "function getVolatility(bytes32 feedId) external view returns (uint256)",
];


export const REBALANCE_EXECUTOR_ABI = [
  "function needsRebalancing(address vault, address token1, address token2, uint256 targetAlloc1, uint256 targetAlloc2, uint256 volatilityThreshold, bytes32 priceFeedId) external view returns (bool, uint256)",
  "function executeRebalance(address vault, address token1, address token2, uint256 targetAlloc1, uint256 targetAlloc2, uint256 volatilityThreshold, bytes32 priceFeedId) external",
  "function isAuthorizedAgent(address agent) external view returns (bool)",
];

export const USER_VAULT_ABI = [
  "function getHBARBalance() external view returns (uint256)",
  "function withdrawToken(address token, uint256 amount, address recipient) external",
];

export const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

export const PYTH_ABI = [
  "function getUpdateFee(bytes[] calldata updateData) external view returns (uint256)",
];
