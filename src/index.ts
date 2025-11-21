import { A2AServerFactory } from "./a2a/server-factory.js";
import {
  volatilityUpdaterCard,
  volatilityAdvisorCard,
  rebalanceCheckerCard,
  allocationStrategistCard,
  rebalanceExecutorCard,
} from "./a2a/agent-cards.js";
import { VolatilityUpdaterExecutor } from "./agents/volatility-updater.js";
import { VolatilityAdvisorExecutor } from "./agents/volatility-advisor.js";
import { RebalanceCheckerExecutor } from "./agents/rebalance-checker.js";
import { AllocationStrategistExecutor } from "./agents/allocation-strategist.js";
import { RebalanceExecutorAgent } from "./agents/rebalance-executor.js";
import { config } from "./config/index.js";

console.log("🚀 Starting ReVaultron A2A Agent System...\n");

// Initialize all agents
const volatilityUpdater = new VolatilityUpdaterExecutor();
const volatilityAdvisor = new VolatilityAdvisorExecutor();
const rebalanceChecker = new RebalanceCheckerExecutor();
const allocationStrategist = new AllocationStrategistExecutor();
const rebalanceExecutor = new RebalanceExecutorAgent();

// Start A2A servers for each agent
A2AServerFactory.createServer(
  volatilityUpdaterCard,
  volatilityUpdater,
  config.agents.volatilityUpdater.port
);

A2AServerFactory.createServer(
  volatilityAdvisorCard,
  volatilityAdvisor,
  config.agents.volatilityAdvisor.port
);

A2AServerFactory.createServer(
  rebalanceCheckerCard,
  rebalanceChecker,
  config.agents.rebalanceChecker.port
);

A2AServerFactory.createServer(
  allocationStrategistCard,
  allocationStrategist,
  config.agents.allocationStrategist.port
);

A2AServerFactory.createServer(
  rebalanceExecutorCard,
  rebalanceExecutor,
  config.agents.rebalanceExecutor.port
);

// Start periodic volatility updates (every 30 seconds)
setTimeout(() => {
  console.log("\n🎬 Initiating periodic agent workflow...\n");
  volatilityUpdater.startPeriodicUpdates();
}, 2000);

console.log("\n✨ All agents are running!");
console.log("💡 The system will automatically update volatility every 30 seconds");
console.log("💡 Use Ctrl+C to stop\n");

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down agents...");
  volatilityUpdater.stopPeriodicUpdates();
  process.exit(0);
});
