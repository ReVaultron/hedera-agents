import dotenv from "dotenv";
dotenv.config();

export const config = {
  hedera: {
    // Replace accountId with real Hedera account once you derive it from the private key
    accountId: process.env.HEDERA_ACCOUNT_ID || "0.0.6870829",
    privateKey:
      process.env.HEDERA_PRIVATE_KEY ||
      "0x8412616778261ee7cd57ac5669ea2cee34a1ca4bc072f9cecf11197ab442f371",
    network: process.env.HEDERA_NETWORK || "testnet",
  },
  contracts: {
    volatilityIndex:
      process.env.VOLATILITY_INDEX_ADDRESS ||
      "0x97F4d5000Fdfcf0D8114B8642E05922a2dD3B931",
    rebalanceExecutor:
      process.env.REBALANCE_EXECUTOR_ADDRESS ||
      "0x1ff38A5E5aE6B82Ef8f738373ed423A16d5C273D",
    userVault:
      process.env.USER_VAULT_ADDRESS ||
      "0x0f7aE4c05f01c43CA57B57887202b4C55eb61fe5",
    usdc:
      process.env.USDC_ADDRESS ||
      "0x6db9f7d36c5d6eA35F51D171bFc1A0787aB717d8",
    pyth:
      process.env.PYTH_CONTRACT_ADDRESS ||
      "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729",
  },
  pyth: {
    hbarPriceFeedId:
      process.env.HBAR_PRICE_FEED_ID ||
      "0x3728e591097635310e6341af53db8b7ee42da9b3a8d918f9463ce9cca886dfbd",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "AIzaSyAP5p_G6K7ncmZybAopOZjnJZGfxw2bjfk",
  },
  agents: {
    volatilityUpdater: {
      port: parseInt(process.env.VOLATILITY_UPDATER_PORT || "4001"),
    },
    volatilityAdvisor: {
      port: parseInt(process.env.VOLATILITY_ADVISOR_PORT || "4002"),
    },
    rebalanceChecker: {
      port: parseInt(process.env.REBALANCE_CHECKER_PORT || "4003"),
    },
    allocationStrategist: {
      port: parseInt(process.env.ALLOCATION_STRATEGIST_PORT || "4004"),
    },
    rebalanceExecutor: {
      port: parseInt(process.env.REBALANCE_EXECUTOR_PORT || "4005"),
    },
  },
};

export default config;
